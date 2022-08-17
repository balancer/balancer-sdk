import { Interface } from '@ethersproject/abi';
import { BigNumber } from '@ethersproject/bignumber';
import { AddressZero, MaxInt256 } from '@ethersproject/constants';

import { BalancerError, BalancerErrorCode } from '@/balancerErrors';
import { Relayer } from '@/modules/relayer/relayer.module';
import { BatchSwapStep, FundManagement, SwapType } from '@/modules/swaps/types';
import { WeightedPoolEncoder } from '@/pool-weighted';
import { JoinPoolRequest } from '@/types';
import { PoolRepository } from '../data';
import { PoolGraph, Node } from './graph';

import balancerRelayerAbi from '@/lib/abi/BalancerRelayer.json';
import { Network } from '@/lib/constants/network';
import { networkAddresses } from '@/lib/constants/config';
import { AssetHelpers } from '@/lib/utils';
const balancerRelayerInterface = new Interface(balancerRelayerAbi);

export class Join {
  totalProportions: Record<string, BigNumber> = {};
  private relayer: string;
  private wrappedNativeAsset;
  constructor(private pools: PoolRepository, chainId: number) {
    if (chainId !== Network.GOERLI) throw new Error('Unsupported network'); // TODO: figure out which networks should be supported

    const { tokens, contracts } = networkAddresses(chainId);
    this.relayer = contracts.relayer as string;
    this.wrappedNativeAsset = tokens.wrappedNativeAsset;
  }

  async joinPool(
    poolId: string,
    expectedBPTOut: string,
    tokens: string[],
    amounts: string[],
    userAddress: string
  ): Promise<{
    to: string;
    data: string;
    decode: (output: string) => string;
  }> {
    const rootPool = await this.pools.find(poolId);
    if (!rootPool) throw new BalancerError(BalancerErrorCode.POOL_DOESNT_EXIST);
    const poolsGraph = new PoolGraph(this.pools);

    const rootNode = await poolsGraph.buildGraphFromRootPool(poolId);
    const orderedNodes = poolsGraph.orderByBfs(rootNode);
    const calls = this.createActionCalls(
      orderedNodes,
      poolId,
      expectedBPTOut,
      tokens,
      amounts,
      userAddress
    );

    const callData = balancerRelayerInterface.encodeFunctionData('multicall', [
      calls,
    ]);

    return {
      to: this.relayer,
      data: callData,
      decode: (output) => {
        return 'todo'; // TODO: add decode function
      },
    };
  }

  createActionCalls(
    orderedNodes: Node[],
    rootId: string,
    expectedBPTOut: string,
    tokens: string[],
    amounts: string[],
    userAddress: string
  ): string[] {
    const calls: string[] = [];
    this.updateTotalProportions(orderedNodes);
    // Create actions for each Node and return in multicall array
    orderedNodes.forEach((node) => {
      const expectedOut = node.id === rootId ? expectedBPTOut : '0';
      const sender = node.children.some((child) => child.action === 'input') // first chained action
        ? userAddress
        : this.relayer;
      const recipient = node.id === rootId ? userAddress : this.relayer; // last chained action
      switch (node.action) {
        // TO DO - Add other Relayer supported Unwraps
        case 'wrapAaveDynamicToken':
          calls.push(this.createAaveWrap(node, sender, recipient));
          break;
        case 'batchSwap':
          calls.push(
            this.createBatchSwap(node, expectedOut, sender, recipient)
          );
          break;
        case 'joinPool':
          calls.push(this.createJoinPool(node, expectedOut, sender, recipient));
          break;
        case 'input':
          this.createMainToken(node, tokens, amounts);
          break;
        default: {
          const inputs = node.children.map((t) => {
            return t.outputReference;
          });
          console.log(
            'Unsupported action',
            node.type,
            node.address,
            node.action,
            `Inputs: ${inputs.toString()}`,
            `OutputRef: ${node.outputReference}`,
            node.proportionOfParent.toString()
          );
        }
      }
    });
    return calls;
  }

  /*
  This creates a map of node address and total proportion.
  Useful for the case where there may be multiple inputs using same token, e.g. DAI input to 2 pools.
  */
  updateTotalProportions(nodes: Node[]): void {
    this.totalProportions = {};
    nodes.forEach((node) => {
      if (!this.totalProportions[node.address])
        this.totalProportions[node.address] = node.proportionOfParent;
      else
        this.totalProportions[node.address] = this.totalProportions[
          node.address
        ].add(node.proportionOfParent); // TODO: check with John if this is indeed node.proportionOfParent
    });
  }

  /*
  These nodes don't have an action but create the correct proportional inputs for each token.
  These input amounts are then copied to the outputRef which the parent node will use.
  */
  createMainToken(node: Node, tokens: string[], amounts: string[]): void {
    // Update amounts to use actual value based off input and proportions
    const tokenIndex = tokens.indexOf(node.address);
    if (tokenIndex === -1) throw new Error('Input token doesnt exist');

    const totalProportion = this.totalProportions[node.address];
    const inputProportion = node.proportionOfParent
      .mul((1e18).toString())
      .div(totalProportion);
    const inputAmount = inputProportion
      .mul(amounts[tokenIndex])
      .div((1e18).toString());
    node.outputReference = inputAmount.toString();
    console.log(
      node.type,
      node.address,
      node.action,
      `Inputs: ${inputAmount.toString()}`,
      `OutputRef: ${node.outputReference}`,
      node.proportionOfParent.toString()
    );
  }

  createAaveWrap(node: Node, sender: string, recipient: string): string {
    const childNode = node.children[0]; // TODO: check if it's possible to have more than one child at this type of node

    console.log(
      node.type,
      node.address,
      `${node.action}(staticToken: ${
        node.address
      }, amount: ${childNode.outputReference.toString()}, outputRef: ${
        node.outputReference
      }) prop: ${node.proportionOfParent.toString()}`
    );

    const call = Relayer.encodeWrapAaveDynamicToken({
      staticToken: childNode.address,
      sender,
      recipient,
      amount: childNode.outputReference,
      fromUnderlying: true, // TODO: check if we should handle the false case as well
      outputReference: Relayer.toChainedReference(node.outputReference),
    });
    return call;
  }

  createBatchSwap(
    node: Node,
    expectedOut: string,
    sender: string,
    recipient: string
  ): string {
    // TO DO - Create actual swap call for Relayer multicall
    const inputAmt = node.children[0].outputReference;
    const inputToken = node.children[0].address;
    const outputToken = node.address;
    const expectedOutputAmount = expectedOut; // This could be used if joining a pool via a swap, e.g. Linear
    const poolId = node.id;
    console.log(
      node.type,
      node.address,
      `${
        node.action
      }(\n  inputAmt: ${inputAmt},\n  inputToken: ${inputToken},\n  pool: ${poolId},\n  outputToken: ${outputToken},\n  outputRef: ${
        node.outputReference
      }\n) prop: ${node.proportionOfParent.toString()}`
    );

    const assets = [
      node.address,
      ...node.children.map((child) => child.address),
    ];

    // For tokens going in to the Vault, the limit shall be a positive number. For tokens going out of the Vault, the limit shall be a negative number.
    const limits: string[] = [
      BigNumber.from(expectedOut).mul(-1).toString(),
      ...node.children.map(() => MaxInt256.toString()), // TODO: check if it's worth limiting inputs as well - if yes, how to get the amount from children nodes?
    ];

    const swaps: BatchSwapStep[] = node.children.map((child) => {
      return {
        poolId: node.id,
        assetInIndex: assets.indexOf(child.address),
        assetOutIndex: assets.indexOf(node.address),
        amount: Relayer.toChainedReference(child.outputReference).toString(),
        userData: '0x',
      };
    });

    const funds: FundManagement = {
      sender,
      recipient,
      fromInternalBalance: sender === this.relayer,
      toInternalBalance: recipient === this.relayer,
    };

    const outputReferences = [
      {
        index: assets.indexOf(node.address),
        key: Relayer.toChainedReference(node.outputReference),
      },
    ];

    const call = Relayer.encodeBatchSwap({
      swapType: SwapType.SwapExactIn,
      swaps,
      assets,
      funds,
      limits,
      deadline: BigNumber.from(Math.ceil(Date.now() / 1000) + 3600), // 1 hour from now
      value: '0',
      outputReferences,
    });

    return call;
  }

  createJoinPool(
    node: Node,
    minAmountOut: string,
    sender: string,
    recipient: string
  ): string {
    const poolId = node.id;
    const inputTokens = node.children.map((t) => t.address);
    const inputAmts = node.children.map((t) => t.outputReference);
    console.log(
      node.type,
      node.address,
      `${
        node.action
      }(\n  poolId: ${poolId},\n  inputTokens: ${inputTokens.toString()},\n  maxAmtsIn: ${inputAmts.toString()},\n  minOut: ${minAmountOut}\n  outputRef: ${
        node.outputReference
      }\n) prop: ${node.proportionOfParent.toString()}`
    );

    const assetHelpers = new AssetHelpers(this.wrappedNativeAsset);
    // sort inputs
    const [sortedTokens, sortedAmounts] = assetHelpers.sortTokens(
      node.children.map((child) => child.address),
      node.children.map((child) =>
        Relayer.toChainedReference(child.outputReference).toString()
      )
    ) as [string[], string[]];

    const userData = WeightedPoolEncoder.joinExactTokensInForBPTOut(
      sortedAmounts,
      minAmountOut
    );

    const ethNode = node.children.find(
      (child) => child.address === AddressZero
    );

    const call = Relayer.constructJoinCall({
      poolId: node.id,
      poolKind: 0, // TODO: figure out how to define this number
      sender,
      recipient,
      value: ethNode
        ? Relayer.toChainedReference(ethNode.outputReference)
        : '0', // TODO: validate if ETH logic applies here
      outputReference: Relayer.toChainedReference(node.outputReference),
      joinPoolRequest: {} as JoinPoolRequest,
      assets: sortedTokens,
      maxAmountsIn: sortedAmounts,
      userData,
      fromInternalBalance: sender === this.relayer,
    });

    return call;
  }
}
