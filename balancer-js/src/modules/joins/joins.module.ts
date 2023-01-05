import { defaultAbiCoder } from '@ethersproject/abi';
import { cloneDeep } from 'lodash';
import { Interface } from '@ethersproject/abi';
import { BigNumber, parseFixed } from '@ethersproject/bignumber';
import {
  AddressZero,
  MaxInt256,
  WeiPerEther,
  Zero,
} from '@ethersproject/constants';

import { BalancerError, BalancerErrorCode } from '@/balancerErrors';
import { Relayer } from '@/modules/relayer/relayer.module';
import { BatchSwapStep, FundManagement, SwapType } from '@/modules/swaps/types';
import { StablePoolEncoder } from '@/pool-stable';
import {
  BalancerNetworkConfig,
  JoinPoolRequest,
  Pool,
  PoolAttribute,
  PoolType,
} from '@/types';
import { Findable } from '../data/types';
import { PoolGraph, Node } from '../graph/graph';

import { subSlippage } from '@/lib/utils/slippageHelper';
import TenderlyHelper from '@/lib/utils/tenderlyHelper';
import balancerRelayerAbi from '@/lib/abi/RelayerV4.json';
import { networkAddresses } from '@/lib/constants/config';
import { AssetHelpers, isSameAddress } from '@/lib/utils';
import {
  SolidityMaths,
  _computeScalingFactor,
  _upscale,
} from '@/lib/utils/solidityMaths';
import { calcPriceImpact } from '../pricing/priceImpact';
import { WeightedPoolEncoder } from '@/pool-weighted';
import { getPoolAddress } from '@/pool-utils';
const balancerRelayerInterface = new Interface(balancerRelayerAbi);

export class Join {
  private relayer: string;
  private wrappedNativeAsset;
  private tenderlyHelper: TenderlyHelper;
  constructor(
    private pools: Findable<Pool, PoolAttribute>,
    networkConfig: BalancerNetworkConfig
  ) {
    const { tokens, contracts } = networkAddresses(networkConfig.chainId);
    this.relayer = contracts.relayerV4 as string;
    this.wrappedNativeAsset = tokens.wrappedNativeAsset;

    this.tenderlyHelper = new TenderlyHelper(
      networkConfig.chainId,
      networkConfig.tenderly
    );
  }

  async joinPool(
    poolId: string,
    tokensIn: string[],
    amountsIn: string[],
    userAddress: string,
    wrapMainTokens: boolean,
    slippage: string,
    authorisation?: string
  ): Promise<{
    to: string;
    callData: string;
    expectedOut: string;
    minOut: string;
    priceImpact: string;
  }> {
    if (tokensIn.length != amountsIn.length)
      throw new BalancerError(BalancerErrorCode.INPUT_LENGTH_MISMATCH);

    // Create nodes for each pool/token interaction and order by breadth first
    const orderedNodes = await PoolGraph.getGraphNodes(
      true,
      poolId,
      this.pools,
      wrapMainTokens
    );

    const joinPaths = Join.getJoinPaths(orderedNodes, tokensIn, amountsIn);

    const totalBptZeroPi = Join.totalBptZeroPriceImpact(joinPaths);
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
    const { callData: queryData, outputIndexes } = await this.createCalls(
      joinPaths,
      userAddress,
      undefined,
      authorisation
    );

    // static call (or V4 special call) to get actual amounts for each root join
    const { amountsOut, totalAmountOut } = await this.amountsOutByJoinPath(
      userAddress,
      queryData,
      tokensIn,
      outputIndexes
    );

    const { minAmountsOut, totalMinAmountOut } = this.minAmountsOutByJoinPath(
      slippage,
      amountsOut,
      totalAmountOut
    );
    const priceImpact = calcPriceImpact(
      BigInt(totalAmountOut),
      totalBptZeroPi.toBigInt(),
      true
    ).toString();

    // Create calls with minAmountsOut
    const { callData, deltas } = await this.createCalls(
      joinPaths,
      userAddress,
      minAmountsOut,
      authorisation
    );

    this.assertDeltas(poolId, deltas, tokensIn, amountsIn, totalMinAmountOut);

    return {
      to: this.relayer,
      callData,
      expectedOut: totalAmountOut,
      minOut: totalMinAmountOut,
      priceImpact,
    };
  }

  private assertDeltas(
    poolId: string,
    deltas: Record<string, BigNumber>,
    tokensIn: string[],
    amountsIn: string[],
    minBptOut: string
  ): void {
    const poolAddress = getPoolAddress(poolId);
    const outDiff = deltas[poolAddress.toLowerCase()].add(minBptOut);

    if (outDiff.abs().gt(3)) {
      console.error(
        `join assertDeltas, bptOut: `,
        poolAddress,
        minBptOut,
        deltas[poolAddress.toLowerCase()]?.toString()
      );
      throw new BalancerError(BalancerErrorCode.JOIN_DELTA_AMOUNTS);
    }
    delete deltas[poolAddress.toLowerCase()];

    tokensIn.forEach((token, i) => {
      if (
        !BigNumber.from(amountsIn[i]).eq(0) &&
        deltas[token.toLowerCase()]?.toString() !== amountsIn[i]
      ) {
        console.error(
          `join assertDeltas, tokenIn: `,
          token,
          amountsIn[i],
          deltas[token.toLowerCase()]?.toString()
        );
        throw new BalancerError(BalancerErrorCode.JOIN_DELTA_AMOUNTS);
      }
      delete deltas[token.toLowerCase()];
    });

    for (const token in deltas) {
      if (deltas[token].toString() !== '0') {
        console.error(
          `join assertDeltas, non-input token should be 0: `,
          token,
          deltas[token].toString()
        );
        throw new BalancerError(BalancerErrorCode.JOIN_DELTA_AMOUNTS);
      }
    }
  }

  // Create join paths from tokensIn all the way to the root node.
  static getJoinPaths = (
    orderedNodes: Node[],
    tokensIn: string[],
    amountsIn: string[]
  ): Node[][] => {
    const joinPaths: Node[][] = [];

    // Filter all nodes that contain a token in the tokensIn array
    const inputNodes = orderedNodes.filter((node) =>
      tokensIn
        .filter((t, i) => BigNumber.from(amountsIn[i]).gt(0)) // Remove input tokens with 0 amounts
        .map((tokenIn) => tokenIn.toLowerCase())
        .includes(node.address.toLowerCase())
    );

    // If inputNodes contain at least one leaf token, then add path to join proportionally with all leaf tokens contained in tokensIn
    const containsLeafNode = inputNodes.some((node) => node.isLeaf);
    if (containsLeafNode) {
      joinPaths.push(orderedNodes);
    }

    // Add a join path for each non-leaf input node
    const nonLeafInputNodes = inputNodes.filter((node) => !node.isLeaf);
    nonLeafInputNodes.forEach((nonLeafInputNode) => {
      // Get amount in for current node
      const nonLeafAmountIn = amountsIn.find((amountIn, i) =>
        isSameAddress(tokensIn[i], nonLeafInputNode.address)
      ) as string;
      // Split amount in between nodes with same non-leaf input token based on proportionOfParent
      const totalProportions = nonLeafInputNodes
        .filter((node) => isSameAddress(node.address, nonLeafInputNode.address))
        .reduce(
          (total, node) => total.add(node.proportionOfParent),
          BigNumber.from(0)
        );
      const proportionalNonLeafAmountIn = BigNumber.from(nonLeafAmountIn)
        .mul(nonLeafInputNode.proportionOfParent)
        .div(totalProportions)
        .toString();
      // Create input node for current non-leaf input token
      const [inputTokenNode] = PoolGraph.createInputTokenNode(
        0, // temp value that will be updated after creation
        nonLeafInputNode.address,
        nonLeafInputNode.decimals,
        nonLeafInputNode.parent,
        WeiPerEther
      );
      // Update index to be actual amount in
      inputTokenNode.index = proportionalNonLeafAmountIn;
      inputTokenNode.isLeaf = false;
      // Start join path with input node
      const nonLeafJoinPath = [inputTokenNode];
      // Add each parent to the join path until we reach the root node
      let parent = nonLeafInputNode.parent;
      while (parent) {
        nonLeafJoinPath.push(cloneDeep(parent));
        parent = parent.parent;
      }
      // Add join path to list of join paths
      joinPaths.push(nonLeafJoinPath);
    });

    // After creating all join paths, update the index of each input node to be the amount in for that node
    // All other node indexes will be used as a reference to store the amounts out for that node
    this.updateInputAmounts(joinPaths, tokensIn, amountsIn);

    return joinPaths;
  };

  /*
  AmountsIn should be adjusted after being split between tokensIn to fix eventual rounding issues.
  This prevents the transaction to leave out dust amounts.
  */
  private static updateInputAmounts = (
    joinPaths: Node[][],
    tokensIn: string[],
    amountsIn: string[]
  ): void => {
    // Helper function to calculate and adjust amount difference for each token in
    const ajdustAmountInDiff = (
      tokenInInputNodes: Node[],
      amountIn: string
    ): void => {
      if (tokenInInputNodes.length > 1) {
        // Sum of amountsIn from each input node with same tokenIn
        const amountsInSumforTokenIn = tokenInInputNodes.reduce(
          (sum, currentNode) => sum.add(currentNode.index),
          BigNumber.from(0)
        );
        // Compare total amountIn with sum of amountIn split between each input node with same tokenIn
        const diff = BigNumber.from(amountIn).sub(amountsInSumforTokenIn);
        // Apply difference to first input node with same tokenIn
        tokenInInputNodes[0].index = diff
          .add(tokenInInputNodes[0].index)
          .toString();
      }
    };

    // Update amountsIn within leaf join path
    const leafJoinPath = joinPaths.find((joinPath) => joinPath[0].isLeaf);
    if (leafJoinPath) {
      // Update input proportions so inputs are shared correctly between leaf nodes with same tokenIn
      const totalProportions = this.updateTotalProportions(leafJoinPath);
      // Update input nodes to have correct input amount
      leafJoinPath.forEach((node) => {
        if (node.joinAction === 'input')
          node = this.updateNodeAmount(
            node,
            tokensIn,
            amountsIn,
            totalProportions
          );
      });
      // Adjust amountIn for each tokenIn to fix eventual rounding issues
      tokensIn.forEach((tokenIn, i) => {
        const tokenInInputNodes = leafJoinPath.filter(
          (inputNode) =>
            inputNode.isLeaf && isSameAddress(inputNode.address, tokenIn)
        );
        ajdustAmountInDiff(tokenInInputNodes, amountsIn[i]);
      });
    }

    // Adjust amountsIn shared between non-leaf join paths with same tokenIn
    const nonLeafJoinPaths = joinPaths.filter(
      (joinPath) => !joinPath[0].isLeaf
    );
    if (nonLeafJoinPaths.length > 1) {
      tokensIn.forEach((tokenIn, i) => {
        const tokenInInputNodes = nonLeafJoinPaths
          .map((path) => path[0])
          .filter((node) => isSameAddress(node.address, tokenIn));
        ajdustAmountInDiff(tokenInInputNodes, amountsIn[i]);
      });
    }
  };

  createCalls = async (
    joinPaths: Node[][],
    userAddress: string,
    minAmountsOut?: string[], // one for each joinPath
    authorisation?: string
  ): Promise<{
    callData: string;
    outputIndexes: number[];
    deltas: Record<string, BigNumber>;
  }> => {
    // Create calls for both leaf and non-leaf inputs
    const { calls, outputIndexes, deltas } = this.createActionCalls(
      joinPaths,
      userAddress,
      minAmountsOut
    );

    if (authorisation) {
      calls.unshift(this.createSetRelayerApproval(authorisation));
    }

    const callData = balancerRelayerInterface.encodeFunctionData('multicall', [
      calls,
    ]);

    return {
      callData,
      outputIndexes: authorisation
        ? outputIndexes.map((i) => i + 1)
        : outputIndexes,
      deltas,
    };
  };

  /*
  1. For each input token:
    1. recursively find the spot price for each pool in the path of the join
    2. take the product to get the spot price of the path
    3. multiply the input amount of that token by the path spot price to get the "zeroPriceImpact" amount of BPT for that token
  2. Sum each tokens zeroPriceImpact BPT amount to get total zeroPriceImpact BPT
  */
  static totalBptZeroPriceImpact = (joinPaths: Node[][]): BigNumber => {
    // Add bptZeroPriceImpact for all inputs
    let totalBptZeroPi = BigNumber.from('0');
    joinPaths.forEach((joinPath) => {
      const isLeafJoin = joinPath[0].isLeaf;
      if (isLeafJoin) {
        // Calculate bptZeroPriceImpact for leaf inputs
        const leafNodes = joinPath.filter((node) => node.isLeaf);
        leafNodes.forEach((leafNode) => {
          const bptOut = this.bptOutZeroPiForInputNode(leafNode);
          totalBptZeroPi = totalBptZeroPi.add(bptOut);
        });
      } else {
        // Calculate bptZeroPriceImpact for non-leaf inputs
        const bptOut = this.bptOutZeroPiForInputNode(joinPath[0]);
        totalBptZeroPi = totalBptZeroPi.add(bptOut);
      }
    });
    return totalBptZeroPi;
  };

  /*
  1. recursively find the spot price for each pool in the path of the join
  2. take the product to get the spot price of the path
  3. multiply the input amount of that token by the path spot price to get the "zeroPriceImpact" amount of BPT for that token 
  */
  static bptOutZeroPiForInputNode = (inputNode: Node): bigint => {
    if (inputNode.index === '0' || inputNode.joinAction !== 'input')
      return BigInt(0);
    let spProduct = 1;
    let parentNode: Node | undefined = inputNode.parent;
    let childAddress = inputNode.address;
    // Traverse up graph until we reach root adding each node
    while (parentNode !== undefined) {
      if (
        parentNode.joinAction === 'batchSwap' ||
        parentNode.joinAction === 'joinPool'
      ) {
        const sp = parentNode.spotPrices[childAddress.toLowerCase()];
        spProduct = spProduct * parseFloat(sp);
        childAddress = parentNode.address;
      }
      parentNode = parentNode.parent;
    }
    const spPriceScaled = parseFixed(spProduct.toFixed(18), 18);
    const scalingFactor = _computeScalingFactor(BigInt(inputNode.decimals));
    const inputAmountScaled = _upscale(BigInt(inputNode.index), scalingFactor);
    const bptOut = SolidityMaths.divDownFixed(
      inputAmountScaled,
      spPriceScaled.toBigInt()
    );
    return bptOut;
  };

  /*
  Simulate transaction and decodes each output of interest.
  */
  amountsOutByJoinPath = async (
    userAddress: string,
    callData: string,
    tokensIn: string[],
    outputIndexes: number[]
  ): Promise<{ amountsOut: string[]; totalAmountOut: string }> => {
    const amountsOut: string[] = [];

    const staticResult = await this.tenderlyHelper.simulateMulticall(
      this.relayer,
      callData,
      userAddress,
      tokensIn
    );

    const multicallResult = defaultAbiCoder.decode(
      ['bytes[]'],
      staticResult
    )[0] as string[];

    let totalAmountOut = BigNumber.from('0');
    // Decode each root output
    outputIndexes.forEach((outputIndex) => {
      const value = defaultAbiCoder.decode(
        ['uint256'],
        multicallResult[outputIndex]
      );
      amountsOut.push(value.toString());
      totalAmountOut = totalAmountOut.add(value.toString());
    });

    return {
      amountsOut,
      totalAmountOut: totalAmountOut.toString(),
    };
  };

  /*
  Apply slippage to amounts
  */
  minAmountsOutByJoinPath = (
    slippage: string,
    amounts: string[],
    totalAmountOut: string
  ): { minAmountsOut: string[]; totalMinAmountOut: string } => {
    const minAmountsOut = amounts.map((amount) =>
      subSlippage(BigNumber.from(amount), BigNumber.from(slippage)).toString()
    );
    const totalMinAmountOut = subSlippage(
      BigNumber.from(totalAmountOut),
      BigNumber.from(slippage)
    ).toString();

    return {
      minAmountsOut,
      totalMinAmountOut,
    };
  };

  updateDeltas(
    deltas: Record<string, BigNumber>,
    assets: string[],
    amounts: string[]
  ): Record<string, BigNumber> {
    assets.forEach((t, i) => {
      const asset = t.toLowerCase();
      if (!deltas[asset]) deltas[asset] = Zero;
      deltas[asset] = deltas[asset].add(amounts[i]);
    });
    return deltas;
  }

  // Create actions for each Node and return in multicall array
  // Create calls for each path, use value stored in minBptAmounts if available
  createActionCalls = (
    joinPaths: Node[][],
    userAddress: string,
    minAmountsOut?: string[]
  ): {
    calls: string[];
    outputIndexes: number[];
    deltas: Record<string, BigNumber>;
  } => {
    const calls: string[] = [];
    const outputIndexes: number[] = [];
    const isPeek = !minAmountsOut;
    const deltas: Record<string, BigNumber> = {};

    joinPaths.forEach((joinPath, j) => {
      const isLeafJoin = joinPath[0].isLeaf;
      joinPath.forEach((node, i) => {
        let nodeChildrenWithinJoinPath;
        if (isLeafJoin) {
          nodeChildrenWithinJoinPath = joinPath.filter(
            (joinNode) =>
              node.children.map((n) => n.address).includes(joinNode.address) &&
              node.index === joinNode.parent?.index // Ensure child nodes with same address are not included
          );
        } else {
          nodeChildrenWithinJoinPath = i > 0 ? [joinPath[i - 1]] : [];
        }

        // Prevent adding action calls with input amounts equal 0
        if (
          nodeChildrenWithinJoinPath.length > 0 &&
          nodeChildrenWithinJoinPath.filter((c) => c.index !== '0').length === 0
        ) {
          node.index = '0';
          return;
        }

        // If child node was input the tokens come from user not relayer
        // wrapped tokens have to come from user (Relayer has no approval for wrapped tokens)
        const fromUser = nodeChildrenWithinJoinPath.some(
          (child) =>
            child.joinAction === 'input' ||
            child.joinAction === 'wrapAaveDynamicToken'
        );
        const sender = fromUser ? userAddress : userAddress;

        const isLastChainedCall = i === joinPath.length - 1;
        // Always send to user on last call otherwise send to relayer
        const recipient = isLastChainedCall ? userAddress : userAddress;
        // Last action will use minBptOut to protect user. Middle calls can safely have 0 minimum as tx will revert if last fails.
        const minOut =
          isLastChainedCall && minAmountsOut ? minAmountsOut[j] : '0';

        switch (node.joinAction) {
          // TODO - Add other Relayer supported Unwraps
          case 'wrapAaveDynamicToken':
            // relayer has no allowance to spend its own wrapped tokens so recipient must be the user
            calls.push(
              this.createAaveWrap(
                node,
                nodeChildrenWithinJoinPath,
                j,
                sender,
                userAddress
              )
            );
            break;
          case 'batchSwap': {
            const [call, assets, limits] = this.createBatchSwap(
              node,
              nodeChildrenWithinJoinPath,
              j,
              minOut,
              sender,
              recipient
            );
            calls.push(call);
            this.updateDeltas(deltas, assets, limits);
            break;
          }
          case 'joinPool': {
            const [call, tokensIn, amountsIn, minBptOut] = this.createJoinPool(
              node,
              nodeChildrenWithinJoinPath,
              j,
              minOut,
              sender,
              recipient
            );
            calls.push(call);
            this.updateDeltas(
              deltas,
              [node.address, ...tokensIn],
              [minBptOut, ...amountsIn]
            );
            break;
          }
        }
      });
      if (isPeek) {
        const outputRef = 100 * j;
        const peekCall = Relayer.encodePeekChainedReferenceValue(
          Relayer.toChainedReference(outputRef, false)
        );
        calls.push(peekCall);
        outputIndexes.push(calls.indexOf(peekCall));
      }
    });

    return { calls, outputIndexes, deltas };
  };

  /**
   * Creates a map of node address and total proportion. Used for the case where there may be multiple inputs using same token, e.g. DAI input to 2 pools.
   * @param nodes nodes to consider.
   */
  static updateTotalProportions = (
    nodes: Node[]
  ): Record<string, BigNumber> => {
    const totalProportions: Record<string, BigNumber> = {};
    nodes.forEach((node) => {
      if (!totalProportions[node.address])
        totalProportions[node.address] = node.proportionOfParent;
      else {
        totalProportions[node.address] = totalProportions[node.address].add(
          node.proportionOfParent
        );
      }
    });
    return totalProportions;
  };

  /**
   * Uses relayer to approve itself to act in behalf of the user
   *
   * @param authorisation Encoded authorisation call.
   * @returns relayer approval call
   */
  createSetRelayerApproval = (authorisation: string): string => {
    return Relayer.encodeSetRelayerApproval(this.relayer, true, authorisation);
  };

  static updateNodeAmount = (
    node: Node,
    tokensIn: string[],
    amountsIn: string[],
    totalProportions: Record<string, BigNumber>
  ): Node => {
    /*
    An input node requires a real amount (not an outputRef) as it is first node in chain.
    This amount will be used when chaining to parent.
    Amounts are split proportionally between all inputs with same token.
    */
    const tokenIndex = tokensIn
      .map((t) => t.toLowerCase())
      .indexOf(node.address.toLowerCase());
    if (tokenIndex === -1) {
      node.index = '0';
      return node;
    }

    // Calculate proportional split
    const totalProportion = totalProportions[node.address];
    const inputProportion = node.proportionOfParent
      .mul((1e18).toString())
      .div(totalProportion);
    const inputAmount = inputProportion
      .mul(amountsIn[tokenIndex])
      .div((1e18).toString());
    // Update index with actual value
    node.index = inputAmount.toString();
    // console.log(
    //   `${node.type} ${node.address} prop: ${node.proportionOfParent.toString()}
    //   ${node.joinAction} (
    //     Inputs: ${inputAmount.toString()}
    //     OutputRef: ${node.index}
    //   )`
    // );
    return node;
  };

  createAaveWrap = (
    node: Node,
    nodeChildrenWithinJoinPath: Node[],
    joinPathIndex: number,
    sender: string,
    recipient: string
  ): string => {
    // Throws error based on the assumption that aaveWrap apply only to input tokens from leaf nodes
    if (nodeChildrenWithinJoinPath.length !== 1)
      throw new Error('aaveWrap nodes should always have a single child node');

    const childNode = nodeChildrenWithinJoinPath[0];

    const staticToken = node.address;
    const amount = childNode.index;
    const call = Relayer.encodeWrapAaveDynamicToken({
      staticToken,
      sender,
      recipient,
      amount,
      fromUnderlying: true,
      outputReference: this.getOutputRefValue(joinPathIndex, node).value,
    });

    // console.log(
    //   `${node.type} ${node.address} prop: ${node.proportionOfParent.toString()}
    //   ${node.joinAction} (
    //     staticToken: ${staticToken},
    //     input: ${amount},
    //     outputRef: ${node.index.toString()}
    //   )`
    // );

    return call;
  };

  createBatchSwap = (
    node: Node,
    nodeChildrenWithinJoinPath: Node[],
    joinPathIndex: number,
    expectedOut: string,
    sender: string,
    recipient: string
  ): [string, string[], string[]] => {
    // We only need batchSwaps for main/wrapped > linearBpt so shouldn't be more than token > token
    if (nodeChildrenWithinJoinPath.length !== 1)
      throw new Error('Unsupported batchswap');
    const inputToken = nodeChildrenWithinJoinPath[0].address;
    const inputValue = this.getOutputRefValue(
      joinPathIndex,
      nodeChildrenWithinJoinPath[0]
    );
    const assets = [node.address, inputToken];

    // For tokens going in to the Vault, the limit shall be a positive number. For tokens going out of the Vault, the limit shall be a negative number.
    // First asset will always be the output token (which will be linearBpt) so use expectedOut to set limit
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
        index: assets
          .map((a) => a.toLowerCase())
          .indexOf(node.address.toLowerCase()),
        key: BigNumber.from(this.getOutputRefValue(joinPathIndex, node).value),
      },
    ];

    // console.log(
    //   `${node.type} ${node.address} prop: ${node.proportionOfParent.toString()}
    //   ${node.joinAction}(
    //     inputAmt: ${nodeChildrenWithinJoinPath[0].index},
    //     inputToken: ${nodeChildrenWithinJoinPath[0].address},
    //     pool: ${node.id},
    //     outputToken: ${node.address},
    //     outputRef: ${this.getOutputRefValue(joinPathIndex, node).value},
    //     sender: ${sender},
    //     recipient: ${recipient}
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

    // If the sender is the Relayer the swap is part of a chain and shouldn't be considered for user deltas
    const userTokenIn = sender === this.relayer ? '0' : limits[1];
    // If the receiver is the Relayer the swap is part of a chain and shouldn't be considered for user deltas
    const userBptOut = recipient === this.relayer ? '0' : limits[0];

    return [call, assets, [userBptOut, userTokenIn]];
  };

  createJoinPool = (
    node: Node,
    nodeChildrenWithinJoinPath: Node[],
    joinPathIndex: number,
    minAmountOut: string,
    sender: string,
    recipient: string
  ): [string, string[], string[], string] => {
    const inputTokens: string[] = [];
    const inputAmts: string[] = [];

    // inputTokens needs to include each asset even if it has 0 amount
    node.children.forEach((child) => {
      inputTokens.push(child.address);
      // non-leaf joins should set input amounts only for children that are in their joinPath
      const childWithinJoinPath = nodeChildrenWithinJoinPath.find((c) =>
        isSameAddress(c.address, child.address)
      );
      if (childWithinJoinPath) {
        inputAmts.push(
          this.getOutputRefValue(joinPathIndex, childWithinJoinPath).value
        );
      } else {
        inputAmts.push('0');
      }
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
    const bptIndex = sortedTokens
      .map((t) => t.toLowerCase())
      .indexOf(node.address.toLowerCase());
    if (bptIndex === -1) {
      userDataAmounts = sortedAmounts;
    } else {
      userDataAmounts = [
        ...sortedAmounts.slice(0, bptIndex),
        ...sortedAmounts.slice(bptIndex + 1),
      ];
    }

    let userData: string;
    if (node.type === PoolType.Weighted) {
      userData = WeightedPoolEncoder.joinExactTokensInForBPTOut(
        userDataAmounts,
        minAmountOut
      );
    } else {
      userData = StablePoolEncoder.joinExactTokensInForBPTOut(
        userDataAmounts,
        minAmountOut
      );
    }

    // TODO: add test to join weth/wsteth pool using ETH
    const ethIndex = sortedTokens.indexOf(AddressZero);
    const value = ethIndex === -1 ? '0' : sortedAmounts[ethIndex];

    // console.log(
    //   `${node.type} ${node.address} prop: ${node.proportionOfParent.toString()}
    //   ${node.joinAction}(
    //     poolId: ${node.id},
    //     assets: ${sortedTokens.toString()},
    //     maxAmtsIn: ${sortedAmounts.toString()},
    //     amountsIn: ${userDataAmounts.toString()},
    //     minOut: ${minAmountOut},
    //     outputRef: ${this.getOutputRefValue(joinPathIndex, node).value},
    //     sender: ${sender},
    //     recipient: ${recipient}
    //   )`
    // );

    const call = Relayer.constructJoinCall({
      poolId: node.id,
      kind: 0,
      sender,
      recipient,
      value,
      outputReference: this.getOutputRefValue(joinPathIndex, node).value,
      joinPoolRequest: {} as JoinPoolRequest,
      assets: sortedTokens, // Must include BPT token
      maxAmountsIn: sortedAmounts,
      userData,
      fromInternalBalance: sender === this.relayer,
    });

    const userAmountsTokenIn = sortedAmounts.map((a) =>
      Relayer.isChainedReference(a) ? '0' : a
    );
    const userAmountOut = Relayer.isChainedReference(minAmountOut)
      ? '0'
      : minAmountOut;

    return [
      call,
      // If the sender is the Relayer the join is part of a chain and shouldn't be considered for user deltas
      sender === this.relayer ? [] : sortedTokens,
      sender === this.relayer ? [] : userAmountsTokenIn,
      // If the receiver is the Relayer the join is part of a chain and shouldn't be considered for user deltas
      recipient === this.relayer
        ? Zero.toString()
        : Zero.sub(userAmountOut).toString(), // -ve because coming from Vault
    ];
  };

  getOutputRefValue = (
    joinPathIndex: number,
    node: Node
  ): { value: string; isRef: boolean } => {
    if (node.joinAction === 'input') {
      // Input nodes have their indexes set as the actual input amount, instead of a chained reference
      return { value: node.index, isRef: false };
    } else if (node.index !== '0' || !node.parent) {
      // Root node (parent === undefined) has index zero, but should still pass chained reference as outputRef value
      return {
        value: Relayer.toChainedReference(
          BigNumber.from(node.index).add(joinPathIndex * 100)
        ).toString(),
        isRef: true,
      };
    } else {
      return {
        value: '0',
        isRef: true,
      };
    }
  };
}
