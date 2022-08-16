import { Interface } from '@ethersproject/abi';
import { BigNumber } from '@ethersproject/bignumber';
import { AddressZero, MaxInt256 } from '@ethersproject/constants';
import { BalancerError, BalancerErrorCode } from '@/balancerErrors';
import { Relayer } from '@/modules/relayer/relayer.module';
import { BatchSwapStep, FundManagement, SwapType } from '@/modules/swaps/types';
import { AssetHelpers } from '@/lib/utils';
import { WeightedPoolEncoder } from '@/pool-weighted';
import { ADDRESSES } from '@/test/lib/constants';
import { JoinPoolRequest } from '@/types';
import { PoolRepository } from '../data';
import { PoolGraph, Node } from './graph';

import balancerRelayerAbi from '@/lib/abi/BalancerRelayer.json';
const balancerRelayerInterface = new Interface(balancerRelayerAbi);

export class Join {
  totalProportions: Record<string, BigNumber> = {};
  private addresses;
  private relayer;
  constructor(private pools: PoolRepository, networkId: 1) {
    this.addresses = ADDRESSES[networkId]; // TODO: add support to other networks
    this.relayer = this.addresses.BatchRelayer.address; // TODO: check if this is the best approach
  }

  async joinPool(
    poolId: string,
    expectedBPTOut: string,
    tokens: string[],
    amounts: string[]
  ): Promise<{
    to: string;
    data: string;
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
      amounts
    );

    const callData = balancerRelayerInterface.encodeFunctionData('multicall', [
      calls,
    ]);

    return {
      to: this.relayer,
      data: callData,
    };
  }

  createActionCalls(
    orderedNodes: Node[],
    rootId: string,
    expectedBPTOut: string,
    tokens: string[],
    amounts: string[]
  ): string[] {
    const calls: string[] = [];
    this.updateTotalProportions(orderedNodes);
    // Create actions for each Node and return in multicall array
    orderedNodes.forEach((node) => {
      let expectedOut = '0';
      if (node.id === rootId) expectedOut = expectedBPTOut;
      switch (node.action) {
        // TO DO - Add other Relayer supported Unwraps
        case 'wrapAaveDynamicToken':
          calls.push(this.createAaveWrap(node));
          break;
        case 'batchSwap':
          calls.push(this.createBatchSwap(node, expectedOut));
          break;
        case 'joinPool':
          calls.push(this.createJoinPool(node, expectedOut));
          break;
        case 'input':
          this.createMainToken(node, tokens, amounts);
          break;
        default: {
          const inputs = node.children.map((t) => {
            return t.outputAmt;
          });
          console.log(
            'Unsupported action',
            node.type,
            node.address,
            node.action,
            `Inputs: ${inputs.toString()}`,
            `OutputRef: ${node.outputAmt}`,
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
    node.outputAmt = inputAmount.toString();
    console.log(
      node.type,
      node.address,
      node.action,
      `Inputs: ${inputAmount.toString()}`,
      `OutputRef: ${node.outputAmt}`,
      node.proportionOfParent.toString()
    );
  }

  createAaveWrap(node: Node): string {
    const childNode = node.children[0]; // TODO: check if it's possible to have more than one child at this type of node

    console.log(
      node.type,
      node.address,
      `${node.action}(staticToken: ${
        node.address
      }, amount: ${childNode.outputAmt.toString()}, outputRef: ${
        node.outputAmt
      }) prop: ${node.proportionOfParent.toString()}`
    );

    const call = Relayer.encodeWrapAaveDynamicToken({
      staticToken: childNode.address,
      sender: this.relayer,
      recipient: this.relayer,
      amount: childNode.outputAmt,
      fromUnderlying: true,
      outputReference: Relayer.toChainedReference(node.outputAmt),
    });
    return call;
  }

  createBatchSwap(node: Node, expectedOut: string): string {
    // TO DO - Create actual swap call for Relayer multicall
    const inputAmt = node.children[0].outputAmt;
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
        node.outputAmt
      }\n) prop: ${node.proportionOfParent.toString()}`
    );

    const assets = [
      node.address,
      ...node.children.map((child) => child.address),
    ];

    // For tokens going in to the Vault, the limit shall be a positive number. For tokens going out of the Vault, the limit shall be a negative number.
    const limits: string[] = [
      BigNumber.from(expectedOut).mul(-1).toString(),
      ...node.children.map(() => MaxInt256.toString()), // TODO: check if it's worth limiting inputs as well
    ];

    const swaps: BatchSwapStep[] = node.children.map((child) => {
      return {
        poolId: node.id,
        assetInIndex: assets.indexOf(child.address),
        assetOutIndex: assets.indexOf(node.address),
        amount: Relayer.toChainedReference(child.outputAmt).toString(),
        userData: '0x',
      };
    });

    // TODO: consider having a boolean in the node to check for inner/outter nodes in order to set sender/recipient as relayer/userAddress and to/from internalBalance
    const funds: FundManagement = {
      sender: this.relayer,
      recipient: this.relayer,
      fromInternalBalance: false,
      toInternalBalance: false,
    };

    const outputReferences = [
      {
        index: assets.indexOf(node.address),
        key: Relayer.toChainedReference(node.outputAmt),
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

  createJoinPool(node: Node, minAmountOut: string): string {
    const poolId = node.id;
    const inputTokens = node.children.map((t) => t.address);
    const inputAmts = node.children.map((t) => t.outputAmt);
    console.log(
      node.type,
      node.address,
      `${
        node.action
      }(\n  poolId: ${poolId},\n  inputTokens: ${inputTokens.toString()},\n  maxAmtsIn: ${inputAmts.toString()},\n  minOut: ${minAmountOut}\n  outputRef: ${
        node.outputAmt
      }\n) prop: ${node.proportionOfParent.toString()}`
    );

    const assetHelpers = new AssetHelpers(this.addresses.WETH.address); // TODO: check if needs to be wrappedNativeAsset instead
    // sort inputs
    const [sortedTokens, sortedAmounts] = assetHelpers.sortTokens(
      node.children.map((child) => child.address),
      node.children.map((child) =>
        Relayer.toChainedReference(child.outputAmt).toString()
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
      sender: this.relayer,
      recipient: this.relayer,
      value: ethNode ? Relayer.toChainedReference(ethNode.outputAmt) : '0', // TODO: validate if ETH logic applies here
      outputReference: Relayer.toChainedReference(node.outputAmt),
      joinPoolRequest: {} as JoinPoolRequest,
      assets: sortedTokens,
      maxAmountsIn: sortedAmounts,
      userData,
      fromInternalBalance: true, // TODO: check if inner/outter node logic works here
    });

    return call;
  }
}
