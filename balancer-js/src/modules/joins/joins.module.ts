import { defaultAbiCoder } from '@ethersproject/abi';
import { cloneDeep } from 'lodash';
import { Interface } from '@ethersproject/abi';
import { BigNumber, parseFixed } from '@ethersproject/bignumber';
import { AddressZero, MaxInt256 } from '@ethersproject/constants';

import { BalancerError, BalancerErrorCode } from '@/balancerErrors';
import { Relayer } from '@/modules/relayer/relayer.module';
import { BatchSwapStep, FundManagement, SwapType } from '@/modules/swaps/types';
import { StablePoolEncoder } from '@/pool-stable';
import { JoinPoolRequest, PoolType } from '@/types';
import { PoolRepository } from '../data';
import { PoolGraph, Node } from './graph';

import { subSlippage } from '@/lib/utils/slippageHelper';
import balancerRelayerAbi from '@/lib/abi/BalancerRelayer.json';
import { networkAddresses } from '@/lib/constants/config';
import { AssetHelpers } from '@/lib/utils';
import { JsonRpcSigner } from '@ethersproject/providers';
import {
  SolidityMaths,
  _computeScalingFactor,
  _upscale,
} from '@/lib/utils/solidityMaths';
import { calcPriceImpact } from '../pricing/priceImpact';
const balancerRelayerInterface = new Interface(balancerRelayerAbi);

interface RootOutputInfo {
  outputRef: string;
  callIndex: number;
}

type ReferenceAmounts = { [outputReference: string]: string };

interface RootAmounts {
  refAmounts: ReferenceAmounts;
  total: string;
}

export class Join {
  totalProportions: Record<string, BigNumber> = {};
  private relayer: string;
  private wrappedNativeAsset;
  constructor(private pools: PoolRepository, private chainId: number) {
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
    signer: JsonRpcSigner,
    authorisation?: string
  ): Promise<{
    to: string;
    callData: string;
    expectedOut: string;
    minOut: string;
    priceImpact: string;
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
    // Peek is enabled here so we can static call the returned amounts and use these to set limits
    const callsWithNoMin = await this.createCalls(
      poolId,
      tokens,
      amounts,
      userAddress,
      wrapMainTokens,
      true,
      undefined,
      authorisation
    );

    // static call (or V4 special call) to get actual amounts for each root join
    const queryAmounts = await this.queryRootOutputRefs(
      callsWithNoMin.callData,
      callsWithNoMin.rootOutputInfo,
      signer
    );

    const amountsWithSlippage = this.getAmountsWithSlippage(
      slippage,
      queryAmounts
    );

    const priceImpact = calcPriceImpact(
      BigInt(amountsWithSlippage.total),
      callsWithNoMin.totalBptZeroPi.toBigInt()
    ).toString();

    // Create calls with minAmounts === actualAmountsWithSlippage
    // No peek required here (saves gas)
    const callsWithMin = await this.createCalls(
      poolId,
      tokens,
      amounts,
      userAddress,
      wrapMainTokens,
      false,
      amountsWithSlippage.refAmounts,
      authorisation
    );

    return {
      to: this.relayer,
      callData: callsWithMin.callData,
      expectedOut: queryAmounts.total,
      minOut: amountsWithSlippage.total,
      priceImpact,
    };
  }

  getAmountsWithSlippage(slippage: string, amounts: RootAmounts): RootAmounts {
    // Apply slippage to amounts
    const refAmountsWithSlippage: ReferenceAmounts = {};
    for (const outputRef in amounts.refAmounts) {
      refAmountsWithSlippage[outputRef] = subSlippage(
        BigNumber.from(amounts.refAmounts[outputRef]),
        BigNumber.from(slippage)
      ).toString();
    }
    const totalWithSlippage = subSlippage(
      BigNumber.from(amounts.total),
      BigNumber.from(slippage)
    ).toString();

    return {
      refAmounts: refAmountsWithSlippage,
      total: totalWithSlippage,
    };
  }

  async createCalls(
    poolId: string,
    tokensIn: string[],
    amountsIn: string[],
    userAddress: string,
    wrapMainTokens: boolean,
    isPeek: boolean,
    minBptAmounts?: ReferenceAmounts,
    authorisation?: string
  ): Promise<{
    to: string;
    callData: string;
    rootOutputInfo: RootOutputInfo[];
    totalBptZeroPi: BigNumber;
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

    let totalBptZeroPi = BigNumber.from('0');
    const leafTokens = PoolGraph.getLeafAddresses(orderedNodes);
    leafTokens.forEach((leafToken) => {
      const leafInputNodes = orderedNodes.filter(
        (node) => node.address.toLowerCase() === leafToken.toLowerCase()
      );
      leafInputNodes.forEach((inputNode) => {
        const bptOut = this.bptOutZeroPiForInputNode(inputNode);
        totalBptZeroPi = totalBptZeroPi.add(bptOut);
      });
    });

    // Create calls for leaf token actions - this considers full tree.
    const leafCalls = this.createActionCalls(
      cloneDeep(orderedNodes),
      poolId,
      minBptAmounts ? minBptAmounts['0'] : '0',
      userAddress,
      isPeek
    );

    // Create calls for non-leaf inputs
    const nonLeafInfo = this.createNonLeafInputCalls(
      cloneDeep(orderedNodes),
      poolId,
      tokensIn,
      amountsIn,
      userAddress,
      isPeek,
      minBptAmounts
    );

    totalBptZeroPi = totalBptZeroPi.add(nonLeafInfo.totalBptZeroPi);

    const rootOutputInfo = this.updateOutputInfo(
      nonLeafInfo.rootOutputInfo,
      leafCalls,
      authorisation
    );

    const callsCombined = [...leafCalls, ...nonLeafInfo.calls];
    if (authorisation) {
      callsCombined.unshift(this.createSetRelayerApproval(authorisation));
    }

    const callData = balancerRelayerInterface.encodeFunctionData('multicall', [
      callsCombined,
    ]);

    return {
      to: this.relayer,
      callData: callData,
      rootOutputInfo,
      totalBptZeroPi,
    };
  }

  /*
  1. recursively find the spot price for each pool in the path of the join
  2. take the product to get the spot price of the path
  3. multiply the input amount of that token by the path spot price to get the "zeroPriceImpact" amount of BPT for that token 
  */
  bptOutZeroPiForInputNode(inputNode: Node): bigint {
    if (inputNode.outputReference === '0' || inputNode.action !== 'input')
      return BigInt(0);
    let spProduct = 1;
    let parentNode: Node | undefined = inputNode.parent;
    let childAddress = inputNode.address;
    // Traverse up graph until we reach root adding each node
    while (parentNode !== undefined) {
      if (
        parentNode.action === 'batchSwap' ||
        parentNode.action === 'joinPool'
      ) {
        const sp = parentNode.spotPrices[childAddress];
        spProduct = spProduct * parseFloat(sp);
        childAddress = parentNode.address;
      }
      parentNode = parentNode.parent;
    }
    const spPriceScaled = parseFixed(spProduct.toString(), 18);
    const scalingFactor = _computeScalingFactor(BigInt(inputNode.decimals));
    const inputAmountScaled = _upscale(
      BigInt(inputNode.outputReference),
      scalingFactor
    );
    const bptOut = SolidityMaths.mulDownFixed(
      inputAmountScaled,
      spPriceScaled.toBigInt()
    );
    return bptOut;
  }

  /*
  Combines outputs from leaf, non-leaf and auth calls
  */
  updateOutputInfo(
    nonLeafOutputInfo: RootOutputInfo[],
    leafCalls: string[],
    authorisation?: string
  ): RootOutputInfo[] {
    // Auth call will be added to start if it exists
    const auth = authorisation ? 1 : 0;
    const additional = leafCalls.length + auth;
    const info = nonLeafOutputInfo.map((originalInfo) => {
      return {
        outputRef: originalInfo.outputRef,
        callIndex: originalInfo.callIndex + additional,
      };
    });
    if (leafCalls.length > 0) {
      // Any leaf calls will end on root pool with default ref of 0
      info.unshift({
        outputRef: '0',
        callIndex: leafCalls.length - 1 + auth,
      });
    }
    return info;
  }

  createNonLeafInputCalls(
    orderedNodes: Node[],
    poolId: string,
    tokensIn: string[],
    amountsIn: string[],
    userAddress: string,
    isPeek: boolean,
    minBptAmounts?: ReferenceAmounts
  ): {
    calls: string[];
    rootOutputInfo: RootOutputInfo[];
    totalBptZeroPi: BigNumber;
  } {
    const allCalls: string[] = [];
    const rootOutputInfo: RootOutputInfo[] = [];
    const leafTokens = PoolGraph.getLeafAddresses(orderedNodes);
    const nonLeafInputs = tokensIn.filter((t) => !leafTokens.includes(t));
    let startingIndex = orderedNodes.length;
    let totalBptZeroPi = BigNumber.from('0');

    nonLeafInputs.forEach((tokenInput) => {
      // Find path to root and update amounts
      const nodesToRoot = this.getNodesToRootFromToken(
        orderedNodes,
        tokensIn,
        amountsIn,
        tokenInput,
        startingIndex
      );
      // The last node will be joining root and we want this reference to find final amount out
      const rootNode = nodesToRoot[nodesToRoot.length - 1];
      if (rootNode.id !== poolId)
        throw new Error('Error creating non-leaf join.');
      // Create calls for path, use value stored in minBptAmounts if available
      const inputCalls = this.createActionCalls(
        nodesToRoot,
        poolId,
        minBptAmounts ? minBptAmounts[rootNode.outputReference] : '0',
        userAddress,
        isPeek
      );
      // Add chain calls to previous list of calls
      allCalls.push(...inputCalls);
      rootOutputInfo.push({
        outputRef: rootNode.outputReference,
        callIndex: allCalls.length - 1, // Last call will be root for this token in
      });

      const inputNodes = nodesToRoot.filter(
        (node) => node.address.toLowerCase() === tokenInput.toLowerCase()
      );
      inputNodes.forEach((inputNode) => {
        const bptOut = this.bptOutZeroPiForInputNode(inputNode);
        totalBptZeroPi = totalBptZeroPi.add(bptOut);
      });

      startingIndex = orderedNodes.length + nodesToRoot.length;
    });
    return {
      calls: allCalls,
      rootOutputInfo,
      totalBptZeroPi,
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

  async staticMulticall(
    signer: JsonRpcSigner,
    encodedMulticalls: string
  ): Promise<string[]> {
    const MAX_GAS_LIMIT = 8e6;
    const gasLimit = MAX_GAS_LIMIT;

    const staticResult = await signer.call({
      to: this.relayer,
      data: encodedMulticalls,
      gasLimit,
    });
    // console.log(staticResult);

    return defaultAbiCoder.decode(['bytes[]'], staticResult)[0] as string[];
  }

  /*
  Static calls multicall and decodes each output of interest.
  */
  async queryRootOutputRefs(
    callData: string,
    rootOutputInfo: RootOutputInfo[],
    signer: JsonRpcSigner
  ): Promise<RootAmounts> {
    const outputRefAmounts: ReferenceAmounts = {};
    const multicallResult = await this.staticMulticall(signer, callData);

    let total = BigNumber.from('0');
    // Decode each root output
    rootOutputInfo.forEach((rootOutput) => {
      const value = defaultAbiCoder.decode(
        ['uint256'],
        multicallResult[rootOutput.callIndex]
      );
      outputRefAmounts[rootOutput.outputRef] = value.toString();
      total = total.add(value.toString());
    });

    return {
      refAmounts: outputRefAmounts,
      total: total.toString(),
    };
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
    const poolsGraph = new PoolGraph(this.pools, {
      network: this.chainId,
      rpcUrl: '',
    });

    const rootNode = await poolsGraph.buildGraphFromRootPool(
      poolId,
      wrapMainTokens
    );

    if (rootNode.type !== PoolType.ComposableStable) {
      throw new Error('root pool type should be ComposableStable');
    }

    if (rootNode.id !== poolId) throw new Error('Error creating graph nodes');

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
    userAddress: string,
    isPeek: boolean
  ): string[] {
    const calls: string[] = [];
    // Create actions for each Node and return in multicall array
    orderedNodes.forEach((node, i) => {
      // if all child nodes have 0 output amount, then forward it to outputRef and skip adding current call
      // TODO Check logic of this with Bruno
      if (
        node.children.length > 0 &&
        node.children.filter((c) => c.outputReference !== '0').length === 0
      ) {
        node.outputReference = '0';
        return;
      }

      // If child node was input the tokens come from user not relayer
      // wrapped tokens have to come from user (Relayer has no approval for wrapped tokens)
      const fromUser = node.children.some(
        (children) =>
          children.action === 'input' ||
          children.action === 'wrapAaveDynamicToken'
      );
      const sender = fromUser ? userAddress : this.relayer;

      const isLastChainedCall = i === orderedNodes.length - 1;
      if (isLastChainedCall && node.id !== rootId)
        throw Error('Last call must be to root');
      // Always send to user on last call otherwise send to relayer
      const recipient = isLastChainedCall ? userAddress : this.relayer;
      // Last action will use minBptOut to protect user. Middle calls can safely have 0 minimum as tx will revert if last fails.
      const minOut = isLastChainedCall ? minBPTOut : '0';

      switch (node.action) {
        // TODO - Add other Relayer supported Unwraps
        case 'wrapAaveDynamicToken':
          // relayer has no allowance to spend its own wrapped tokens so recipient must be the user
          calls.push(this.createAaveWrap(node, sender, userAddress));
          break;
        case 'batchSwap':
          calls.push(this.createBatchSwap(node, minOut, sender, recipient));
          break;
        case 'joinPool':
          // Only need to peek at joinPool result for final node
          if (isPeek && node.id === rootId)
            calls.push(
              ...this.createJoinPool(node, minOut, sender, recipient, true)
            );
          else
            calls.push(
              ...this.createJoinPool(node, minOut, sender, recipient, false)
            );

          break;
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
    if (tokenIndex === -1) {
      node.outputReference = '0';
      return node;
    }

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
    // console.log(
    //   `${node.type} ${node.address} prop: ${node.proportionOfParent.toString()}
    //   ${node.action} (
    //     Inputs: ${inputAmount.toString()}
    //     OutputRef: ${node.outputReference}
    //   )`
    // );
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
    // We only need batchSwaps for main/wrapped > linearBpt so shouldn't be more than token > token
    if (node.children.length !== 1) throw new Error('Unsupported batchswap');
    const inputToken = node.children[0].address;
    const inputValue = this.getOutputRefValue(node.children[0]);
    const assets = [node.address, inputToken];

    // For tokens going in to the Vault, the limit shall be a positive number. For tokens going out of the Vault, the limit shall be a negative number.
    // First asset will always be the output token so use expectedOut to set limit
    // We don't know input amounts if they are part of a chain so set to max input
    // TODO can we be safer?
    const limits: string[] = [
      BigNumber.from(expectedOut).mul(-1).toString(),
      inputValue.isRef ? MaxInt256.toString() : inputValue.value,
    ];

    // TODO Change to single swap to save gas
    const swaps: BatchSwapStep[] = [
      {
        poolId: node.id,
        assetInIndex: 1,
        assetOutIndex: 0,
        amount: inputValue.value,
        userData: '0x',
      },
    ];

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

  getOutputRefValue(node: Node): { value: string; isRef: boolean } {
    if (node.action === 'input')
      return { value: node.outputReference, isRef: false };
    else if (node.outputReference !== '0')
      return {
        value: Relayer.toChainedReference(node.outputReference).toString(),
        isRef: true,
      };
    else
      return {
        value: '0',
        isRef: true,
      };
  }

  createJoinPool(
    node: Node,
    minAmountOut: string,
    sender: string,
    recipient: string,
    isPeek: boolean
  ): string[] {
    const inputTokens: string[] = [];
    const inputAmts: string[] = [];

    // inputTokens needs to include each asset even if it has 0 amount
    node.children.forEach((child) => {
      inputTokens.push(child.address);
      inputAmts.push(this.getOutputRefValue(child).value);
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

    // console.log(
    //   `${node.type} ${node.address} prop: ${node.proportionOfParent.toString()}
    //   ${node.action}(
    //     poolId: ${node.id},
    //     assets: ${sortedTokens.toString()},
    //     maxAmtsIn: ${sortedAmounts.toString()},
    //     amountsIn: ${userDataAmounts.toString()},
    //     minOut: ${minAmountOut},
    //     outputRef: ${node.outputReference}
    //   )`
    // );

    const peekCall = Relayer.encodePeekChainedReferenceValue(
      Relayer.toChainedReference(node.outputReference, false)
    );

    const call = Relayer.constructJoinCall({
      poolId: node.id,
      poolKind: 0,
      sender,
      recipient,
      value,
      outputReference: Relayer.toChainedReference(node.outputReference),
      joinPoolRequest: {} as JoinPoolRequest,
      assets: sortedTokens, // Must include BPT token
      maxAmountsIn: sortedAmounts,
      userData,
      fromInternalBalance: sender === this.relayer,
    });

    if (isPeek) return [call, peekCall];
    else return [call];
  }
}
