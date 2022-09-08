import { Interface } from '@ethersproject/abi';
import { BigNumber } from '@ethersproject/bignumber';
import { AddressZero, MaxInt256 } from '@ethersproject/constants';

import { BalancerError, BalancerErrorCode } from '@/balancerErrors';
import { Relayer } from '@/modules/relayer/relayer.module';
import { BatchSwapStep, FundManagement, SwapType } from '@/modules/swaps/types';
import { StablePoolEncoder } from '@/pool-stable';
import { JoinPoolRequest, PoolType } from '@/types';
import { PoolRepository } from '../data';
import { PoolGraph, Node } from './graph';

import balancerRelayerAbi from '@/lib/abi/BalancerRelayer.json';
import { networkAddresses } from '@/lib/constants/config';
import { AssetHelpers } from '@/lib/utils';
const balancerRelayerInterface = new Interface(balancerRelayerAbi);

export class Join {
  totalProportions: Record<string, BigNumber> = {};
  private relayer: string;
  private wrappedNativeAsset;
  constructor(private pools: PoolRepository, chainId: number) {
    const { tokens, contracts } = networkAddresses(chainId);
    this.relayer = contracts.relayer as string;
    this.wrappedNativeAsset = tokens.wrappedNativeAsset;
  }

  async joinPool(
    poolId: string,
    tokens: string[],
    amounts: string[],
    userAddress: string,
    wrapMainTokens: boolean,
    slippage: string,
    authorisation?: string
  ): Promise<{
    to: string;
    callData: string;
    minOut: string;
  }> {
    /*
    - Create calls with 0 min bpt for each root join
    - static call (or V4 special call) to get actual amounts for each root join
    - Apply slippage to amounts
    - Recreate calls with minAmounts === actualAmountsWithSlippage
    - Return minAmoutOut (sum actualAmountsWithSlippage), UI would use this to display to user
    - Return updatedCalls, UI would use this to execute tx
    */
    // Create calls with 0 expected for each root join
    const callsWithNoMin = await this.createCalls(
      poolId,
      tokens,
      amounts,
      userAddress,
      wrapMainTokens,
      undefined,
      authorisation
    );

    // static call (or V4 special call) to get actual amounts for each root join
    const expectedAmounts = await this.queryOutputRefs(
      callsWithNoMin.outputRefs
    );
    // TODO Apply slippage to amounts
    const minAmounts = expectedAmounts;
    // minAmoutOut (sum actualAmountsWithSlippage), UI would use this to display to user
    let minOut = BigNumber.from('0');
    for (const key in minAmounts) {
      minOut = minOut.add(minAmounts[key]);
    }

    // Create calls with minAmounts === actualAmountsWithSlippage
    const callsWithMin = await this.createCalls(
      poolId,
      tokens,
      amounts,
      userAddress,
      wrapMainTokens,
      minAmounts,
      authorisation
    );

    return {
      to: this.relayer,
      callData: callsWithMin.callData,
      minOut: minOut.toString(),
    };
  }

  async createCalls(
    poolId: string,
    tokensIn: string[],
    amountsIn: string[],
    userAddress: string,
    wrapMainTokens: boolean,
    minBptAmounts?: Record<string, string>,
    authorisation?: string
  ): Promise<{
    to: string;
    callData: string;
    outputRefs: string[];
  }> {
    if (tokensIn.length != amountsIn.length)
      throw new BalancerError(BalancerErrorCode.INPUT_LENGTH_MISMATCH);

    // Create nodes for each pool/token interaction and order by breadth first
    const orderedNodes = await this.getGraphNodes(
      poolId,
      tokensIn,
      amountsIn,
      wrapMainTokens
    );

    // Create calls for leaf token actions - this considers full tree.
    const leafCalls = this.createActionCalls(
      orderedNodes,
      poolId,
      minBptAmounts ? minBptAmounts['0'] : '0',
      userAddress
    );

    // List of outputRefs for each path that finishes on Root node
    const rootOutputRefs: string[] = [];
    if (leafCalls.length > 0) rootOutputRefs.push('0');

    const leafTokens = PoolGraph.getLeafAddresses(orderedNodes);
    const nonLeafInputs = tokensIn.filter((t) => !leafTokens.includes(t));
    let opRefIndex = orderedNodes.length;
    let nonLeafCalls: string[] = [];
    // For each non-leaf input create a call chain to root
    nonLeafInputs.forEach((tokenInput) => {
      console.log(`------- Non-leaf input ${tokenInput}`);
      // Find path to root and update amounts
      const nodesToRoot = this.getNodesToRootFromToken(
        orderedNodes,
        tokensIn,
        amountsIn,
        tokenInput,
        opRefIndex
      );
      // The last node will be joining root and we want this reference to find final amount out
      const rootNode = nodesToRoot[nodesToRoot.length - 1];
      rootOutputRefs.push(rootNode.outputReference);
      // Create calls for path, use value stored in minBptAmounts if available
      const inputCalls = this.createActionCalls(
        nodesToRoot,
        poolId,
        minBptAmounts ? minBptAmounts[rootNode.outputReference] : '0',
        userAddress
      );
      // Add chain calls to previous list of calls
      nonLeafCalls = [...nonLeafCalls, ...inputCalls];
      // Update ref index to be unique for next path
      opRefIndex = orderedNodes.length + nodesToRoot.length;
    });

    // TODO - Some kind of check that each token has a valid path?

    let callsCombined = [];
    if (authorisation) {
      callsCombined.push(this.createSetRelayerApproval(authorisation));
    }
    callsCombined = [...callsCombined, ...leafCalls, ...nonLeafCalls];

    const callData = balancerRelayerInterface.encodeFunctionData('multicall', [
      callsCombined,
    ]);

    return {
      to: this.relayer,
      callData: callData,
      outputRefs: rootOutputRefs,
    };
  }

  updateInputAmounts(
    nodes: Node[],
    tokensIn: string[],
    amountsIn: string[]
  ): void {
    // Update input proportions so inputs are shared correctly
    this.updateTotalProportions(nodes);

    // Updates and input node to have correct input amount
    nodes.forEach((node) => {
      if (node.action === 'input')
        node = this.updateNodeAmount(node, tokensIn, amountsIn);
    });
  }

  async queryOutputRefs(outputRefs: string[]): Promise<Record<string, string>> {
    // TODO Add method to query relayer (waiting for SC)
    const results: Record<string, string> = {};
    outputRefs.forEach(
      // (op, i) => (results[op] = WeiPerEther.mul(i + 1).toString())
      (op, i) => (results[op] = '0')
    );
    return results;
  }

  // Get full graph from root pool and return ordered nodes
  async getGraphNodes(
    poolId: string,
    tokensIn: string[],
    amountsIn: string[],
    wrapMainTokens: boolean
  ): Promise<Node[]> {
    const rootPool = await this.pools.find(poolId);
    if (!rootPool) throw new BalancerError(BalancerErrorCode.POOL_DOESNT_EXIST);
    const poolsGraph = new PoolGraph(this.pools);

    const rootNode = await poolsGraph.buildGraphFromRootPool(
      poolId,
      wrapMainTokens
    );

    if (rootNode.type !== PoolType.ComposableStable) {
      throw new Error('root pool type should be ComposableStable');
    }

    // TODO check for id match

    const orderedNodes = PoolGraph.orderByBfs(rootNode);
    // Update each input node with relevant amount (proportionally)
    this.updateInputAmounts(orderedNodes, tokensIn, amountsIn);
    return orderedNodes;
  }

  getNodesToRootFromToken(
    orderedNodes: Node[],
    tokensIn: string[],
    amountsIn: string[],
    tokenInput: string,
    startingIndex: number
  ): Node[] {
    const nodes = PoolGraph.getNodesToRoot(
      orderedNodes,
      tokenInput,
      startingIndex
    );
    // Update each input node with relevant amount (proportionally)
    this.updateInputAmounts(nodes, tokensIn, amountsIn);
    if (nodes.length === 0) throw new Error('No join path for token');
    return nodes;
  }

  createActionCalls(
    orderedNodes: Node[],
    rootId: string,
    minBPTOut: string,
    userAddress: string
  ): string[] {
    const calls: string[] = [];
    // Create actions for each Node and return in multicall array
    orderedNodes.forEach((node, i) => {
      // if all child nodes have 0 output amount, then forward it to outputRef and skip adding current call
      if (
        node.children.length > 0 &&
        node.children.filter((c) => c.outputReference !== '0').length === 0
      ) {
        node.outputReference = '0'; // TODO Why is this neccessary?
        return;
      }

      // Input tokens will come from user
      // wrapped tokens will come from user (Relayer has no approval for wrapped tokens)
      const fromUser = node.children.some( // TODO Refactor to make clearer
        (children) =>
          children.action === 'input' ||
          children.action === 'wrapAaveDynamicToken'
      );
      const sender = fromUser ? userAddress : this.relayer;

      const isLastChainedCall = i === orderedNodes.length - 1;
      if (isLastChainedCall && node.id !== rootId)
        throw Error('Last call must be to root');
      const recipient = isLastChainedCall ? userAddress : this.relayer;
      const expectedOut = isLastChainedCall ? minBPTOut : '0';

      switch (node.action) {
        // TODO - Add other Relayer supported Unwraps
        case 'wrapAaveDynamicToken':
          // relayer has no allowance to spend its own wrapped tokens so recipient must be the user
          calls.push(this.createAaveWrap(node, sender, userAddress));
          break;
        case 'batchSwap':
          calls.push(
            this.createBatchSwap(node, expectedOut, sender, recipient)
          );
          break;
        case 'joinPool':
          calls.push(this.createJoinPool(node, expectedOut, sender, recipient));
          break;
        default: {
          // const inputs = node.children.map((t) => {
          //   return t.outputReference;
          // });
          // console.log(
          //   'Unsupported action',
          //   node.type,
          //   node.address,
          //   node.action,
          //   `Inputs: ${inputs.toString()}`,
          //   `OutputRef: ${node.outputReference}`,
          //   node.proportionOfParent.toString()
          // );
        }
      }
    });
    return calls;
  }

  /**
   * Creates a map of node address and total proportion. Used for the case where there may be multiple inputs using same token, e.g. DAI input to 2 pools.
   * @param nodes nodes to consider.
   */
  updateTotalProportions(nodes: Node[]): void {
    this.totalProportions = {};
    nodes.forEach((node) => {
      if (!this.totalProportions[node.address])
        this.totalProportions[node.address] = node.proportionOfParent;
      else {
        this.totalProportions[node.address] = this.totalProportions[
          node.address
        ].add(node.proportionOfParent);
      }
    });
  }

  /**
   * Uses relayer to approve itself to act in behalf of the user
   *
   * @param authorisation Encoded authorisation call.
   * @returns relayer approval call
   */
  createSetRelayerApproval(authorisation: string): string {
    return Relayer.encodeSetRelayerApproval(this.relayer, true, authorisation);
  }

  updateNodeAmount(node: Node, tokensIn: string[], amountsIn: string[]): Node {
    /*
    An input node requires a real amount (not an outputRef) as it is first node in chain.
    This amount will be used when chaining to parent.
    Amounts are split proportionally between all inputs with same token.
    */
    const tokenIndex = tokensIn.indexOf(node.address);
    if (tokenIndex === -1) return node; // TODO proper error, change to '0'?

    // Calculate proportional split
    const totalProportion = this.totalProportions[node.address];
    const inputProportion = node.proportionOfParent
      .mul((1e18).toString())
      .div(totalProportion);
    const inputAmount = inputProportion
      .mul(amountsIn[tokenIndex])
      .div((1e18).toString());
    // Update outputReference with actual value
    node.outputReference = inputAmount.toString();
    console.log(
      `${node.type} ${node.address} prop: ${node.proportionOfParent.toString()}
      ${node.action} (
        Inputs: ${inputAmount.toString()}
        OutputRef: ${node.outputReference}
      )`
    );
    return node;
  }

  createAaveWrap(node: Node, sender: string, recipient: string): string {
    // Throws error based on the assumption that aaveWrap apply only to input tokens from leaf nodes
    if (node.children.length !== 1)
      throw new Error('aaveWrap nodes should always have a single child node');

    const childNode = node.children[0];

    const staticToken = node.address;
    const amount = childNode.outputReference;
    const call = Relayer.encodeWrapAaveDynamicToken({
      staticToken,
      sender,
      recipient,
      amount,
      fromUnderlying: true,
      outputReference: Relayer.toChainedReference(node.outputReference),
    });

    // console.log(
    //   `${node.type} ${node.address} prop: ${node.proportionOfParent.toString()}
    //   ${node.action} (
    //     staticToken: ${staticToken},
    //     input: ${amount},
    //     outputRef: ${node.outputReference.toString()}
    //   )`
    // );

    return call;
  }

  createBatchSwap(
    node: Node,
    expectedOut: string,
    sender: string,
    recipient: string
  ): string {
    // console.log(
    //   `${node.type} ${node.address} prop: ${node.proportionOfParent.toString()}
    //   ${node.action}(
    //     inputAmt: ${node.children[0].outputReference},
    //     inputToken: ${node.children[0].address},
    //     pool: ${node.id},
    //     outputToken: ${node.address},
    //     outputRef: ${node.outputReference}
    //   )`
    // );

    const inputTokens: string[] = [];
    const inputAmts: string[] = [];

    // For each child with a non-zero amount create an input for swap
    node.children.forEach((child) => {
      const amount = this.getOutputRefValue(child);
      if (amount !== '0') {
        inputTokens.push(child.address);
        inputAmts.push(amount);
      }
    });

    const assets = [node.address, ...inputTokens];

    // For tokens going in to the Vault, the limit shall be a positive number. For tokens going out of the Vault, the limit shall be a negative number.
    const limits: string[] = [
      BigNumber.from(expectedOut).mul(-1).toString(),
      ...inputAmts.map(() => MaxInt256.toString()), // TODO: check if it's worth limiting inputs as well - if yes, how to get the amount from children nodes?
    ];

    const swaps: BatchSwapStep[] = inputTokens.map((token, i) => {
      return {
        poolId: node.id,
        assetInIndex: assets.indexOf(token),
        assetOutIndex: assets.indexOf(node.address), // TODO - Is this right?
        amount: inputAmts[i],
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

  // TODO - Add check for final output token as safety.

  getOutputRefValue(node: Node): string {
    if (node.action === 'input') return node.outputReference;
    else if (node.outputReference !== '0')
      return Relayer.toChainedReference(node.outputReference).toString();
    else return '0';
  }

  createJoinPool(
    node: Node,
    minAmountOut: string,
    sender: string,
    recipient: string
  ): string {
    const inputTokens: string[] = [];
    const inputAmts: string[] = [];

    // inputTokens needs to include each asset even if it has 0 amount
    node.children.forEach((child) => {
      inputTokens.push(child.address);
      inputAmts.push(this.getOutputRefValue(child));
    });

    if (node.type === PoolType.ComposableStable) {
      // assets need to include the phantomPoolToken
      inputTokens.push(node.address);
      // need to add a placeholder so sorting works
      inputAmts.push('0');
    }

    // sort inputs
    const assetHelpers = new AssetHelpers(this.wrappedNativeAsset);
    const [sortedTokens, sortedAmounts] = assetHelpers.sortTokens(
      inputTokens,
      inputAmts
    ) as [string[], string[]];

    // userData amounts should not include the BPT of the pool being joined
    let userDataAmounts = [];
    const bptIndex = sortedTokens.indexOf(node.address);
    if (bptIndex === -1) {
      userDataAmounts = sortedAmounts;
    } else {
      userDataAmounts = [
        ...sortedAmounts.slice(0, bptIndex),
        ...sortedAmounts.slice(bptIndex + 1),
      ];
    }

    const userData = StablePoolEncoder.joinExactTokensInForBPTOut(
      userDataAmounts,
      minAmountOut
    );

    // TODO: add test to join weth/wsteth pool using ETH
    const ethIndex = sortedTokens.indexOf(AddressZero);
    const value = ethIndex === -1 ? '0' : sortedAmounts[ethIndex];

    console.log(
      `${node.type} ${node.address} prop: ${node.proportionOfParent.toString()}
      ${node.action}(
        poolId: ${node.id},
        assets: ${sortedTokens.toString()},
        maxAmtsIn: ${sortedAmounts.toString()},
        amountsIn: ${userDataAmounts.toString()},
        minOut: ${minAmountOut},
        outputRef: ${node.outputReference}
      )`
    );

    const call = Relayer.constructJoinCall({
      poolId: node.id,
      poolKind: 0,
      sender,
      recipient,
      value,
      outputReference: '0', // node.outputReference, TODO Why does this cause tx to fail?
      joinPoolRequest: {} as JoinPoolRequest,
      assets: sortedTokens, // Must include BPT token
      maxAmountsIn: sortedAmounts,
      userData,
      fromInternalBalance: sender === this.relayer,
    });

    return call;
  }
}
