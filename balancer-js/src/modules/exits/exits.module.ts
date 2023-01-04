import { defaultAbiCoder } from '@ethersproject/abi';
import { cloneDeep } from 'lodash';
import { Interface } from '@ethersproject/abi';
import { BigNumber } from '@ethersproject/bignumber';
import { MaxInt256, WeiPerEther, Zero } from '@ethersproject/constants';

import { BalancerError, BalancerErrorCode } from '@/balancerErrors';
import { Relayer } from '@/modules/relayer/relayer.module';
import { BatchSwapStep, FundManagement, SwapType } from '@/modules/swaps/types';
import { WeightedPoolEncoder } from '@/pool-weighted';
import { StablePoolEncoder } from '@/pool-stable';
import {
  BalancerNetworkConfig,
  ExitPoolRequest,
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
import { AssetHelpers } from '@/lib/utils';
import { getPoolAddress } from '@/pool-utils';
import { Join } from '../joins/joins.module';
import { calcPriceImpact } from '../pricing/priceImpact';

const balancerRelayerInterface = new Interface(balancerRelayerAbi);

export class Exit {
  private wrappedNativeAsset: string;
  private relayer: string;
  private tenderlyHelper: TenderlyHelper;

  constructor(
    private pools: Findable<Pool, PoolAttribute>,
    networkConfig: BalancerNetworkConfig
  ) {
    const { tokens, contracts } = networkAddresses(networkConfig.chainId);
    this.wrappedNativeAsset = tokens.wrappedNativeAsset;
    this.relayer = contracts.relayerV4 as string;

    this.tenderlyHelper = new TenderlyHelper(
      networkConfig.chainId,
      networkConfig.tenderly
    );
  }

  async exitPool(
    poolId: string,
    amountBptIn: string,
    userAddress: string,
    slippage: string,
    authorisation?: string
  ): Promise<{
    to: string;
    callData: string;
    tokensOut: string[];
    expectedAmountsOut: string[];
    minAmountsOut: string[];
    priceImpact: string;
  }> {
    /*
    Overall exit flow description:
    - Create calls with 0 expected min amount for each token out
    - static call (or V4 special call) to get actual amounts for each token out
    - Apply slippage to amountsOut
    - Recreate calls with minAmounts === actualAmountsWithSlippage
    - Return minAmoutsOut, UI would use this to display to user
    - Return updatedCalls, UI would use this to execute tx
    */

    // Create nodes and order by breadth first
    const orderedNodes = await PoolGraph.getGraphNodes(
      false,
      poolId,
      this.pools,
      false
    );

    // Create exit paths for each output node and splits amount in proportionally between them
    const outputNodes = orderedNodes.filter((n) => n.exitAction === 'output');

    const exitPaths = this.getExitPaths(outputNodes, amountBptIn);

    const tokensOutByExitPath = outputNodes.map((n) => n.address.toLowerCase());
    const tokensOut = [...new Set(tokensOutByExitPath)].sort();

    // Create calls with minimum expected amount out for each exit path
    const staticCall = await this.createCalls(
      exitPaths,
      userAddress,
      undefined,
      authorisation
    );

    const { expectedAmountsOutByExitPath, minAmountsOutByExitPath } =
      await this.amountsOutByExitPath(
        userAddress,
        staticCall.callData,
        orderedNodes[0].address,
        staticCall.outputIndexes,
        slippage
      );

    // Create calls with minimum expected amount out for each exit path
    const { callData, deltas } = await this.createCalls(
      exitPaths,
      userAddress,
      minAmountsOutByExitPath,
      authorisation
    );

    const { expectedAmountsOut, minAmountsOut } = this.amountsOutByTokenOut(
      tokensOut,
      tokensOutByExitPath,
      expectedAmountsOutByExitPath,
      slippage
    );

    this.assertDeltas(poolId, deltas, amountBptIn, tokensOut, minAmountsOut);

    const priceImpact = await this.calculatePriceImpact(
      poolId,
      tokensOut,
      expectedAmountsOut,
      amountBptIn
    );

    return {
      to: this.relayer,
      callData,
      tokensOut,
      expectedAmountsOut,
      minAmountsOut,
      priceImpact,
    };
  }

  /*
  (From Fernando)
  1. Given a bpt amount in find the expect token amounts out (proportionally)
  2. Uses bptZeroPi = _bptForTokensZeroPriceImpact (the same is used for joins too)
  3. PI = bptAmountIn / bptZeroPi - 1
  */
  private async calculatePriceImpact(
    poolId: string,
    tokensOut: string[],
    amountsOut: string[],
    amountBptIn: string
  ): Promise<string> {
    // Create nodes for each pool/token interaction and order by breadth first
    const orderedNodesForJoin = await PoolGraph.getGraphNodes(
      true,
      poolId,
      this.pools,
      false
    );
    const joinPaths = Join.getJoinPaths(
      orderedNodesForJoin,
      tokensOut,
      amountsOut
    );
    const totalBptZeroPi = Join.totalBptZeroPriceImpact(joinPaths);
    const priceImpact = calcPriceImpact(
      BigInt(amountBptIn),
      totalBptZeroPi.toBigInt(),
      false
    ).toString();
    return priceImpact;
  }

  private assertDeltas(
    poolId: string,
    deltas: Record<string, BigNumber>,
    bptIn: string,
    tokensOut: string[],
    amountsOut: string[]
  ): void {
    const poolAddress = getPoolAddress(poolId);
    const outDiff = deltas[poolAddress.toLowerCase()].sub(bptIn);

    if (outDiff.abs().gt(3)) {
      console.error(
        `exit assertDeltas, bptIn: `,
        poolAddress,
        bptIn,
        deltas[poolAddress.toLowerCase()]?.toString()
      );
      throw new BalancerError(BalancerErrorCode.EXIT_DELTA_AMOUNTS);
    }
    delete deltas[poolAddress.toLowerCase()];

    tokensOut.forEach((token, i) => {
      const diff = deltas[token.toLowerCase()].add(amountsOut[i]);
      if (diff.abs().gt(1)) {
        console.error(
          `exit assertDeltas, tokenOut: `,
          token,
          amountsOut[i],
          deltas[token.toLowerCase()]?.toString()
        );
        throw new BalancerError(BalancerErrorCode.EXIT_DELTA_AMOUNTS);
      }
      delete deltas[token.toLowerCase()];
    });

    for (const token in deltas) {
      if (deltas[token].toString() !== '0') {
        console.error(
          `exit assertDeltas, non-input token should be 0: `,
          token,
          deltas[token].toString()
        );
        throw new BalancerError(BalancerErrorCode.EXIT_DELTA_AMOUNTS);
      }
    }
  }

  // Query amounts out through static call and return decoded result
  private amountsOutByExitPath = async (
    userAddress: string,
    callData: string,
    tokenIn: string,
    outputIndexes: number[],
    slippage: string
  ): Promise<{
    expectedAmountsOutByExitPath: string[];
    minAmountsOutByExitPath: string[];
  }> => {
    const simulationResult = await this.tenderlyHelper.simulateMulticall(
      this.relayer,
      callData,
      userAddress,
      [tokenIn]
    );

    // Decode each exit path amount out from static call result
    const multiCallResult = defaultAbiCoder.decode(
      ['bytes[]'],
      simulationResult
    )[0] as string[];

    const expectedAmountsOutByExitPath = outputIndexes.map((outputIndex) => {
      const result = defaultAbiCoder.decode(
        ['uint256'],
        multiCallResult[outputIndex]
      );
      return result.toString();
    });

    // Apply slippage tolerance on expected amount out for each exit path
    const minAmountsOutByExitPath = expectedAmountsOutByExitPath.map(
      (expectedAmountOut) =>
        subSlippage(
          BigNumber.from(expectedAmountOut),
          BigNumber.from(slippage)
        ).toString()
    );

    return { expectedAmountsOutByExitPath, minAmountsOutByExitPath };
  };

  // Aggregate amounts out by exit path into amounts out by token out
  private amountsOutByTokenOut = (
    tokensOut: string[],
    tokensOutByExitPath: string[],
    expectedAmountsOutByExitPath: string[],
    slippage: string
  ) => {
    // Aggregate amountsOutByExitPath into expectedAmountsOut
    const expectedAmountsOutMap: Record<string, BigNumber> = {};
    tokensOutByExitPath.forEach(
      (tokenOut, i) =>
        (expectedAmountsOutMap[tokenOut] = (
          expectedAmountsOutMap[tokenOut] ?? Zero
        ).add(expectedAmountsOutByExitPath[i]))
    );
    const expectedAmountsOut = tokensOut.map((tokenOut) =>
      expectedAmountsOutMap[tokenOut].toString()
    );

    // Apply slippage tolerance on each expected amount out
    const minAmountsOut = expectedAmountsOut.map((expectedAmountOut) =>
      subSlippage(
        BigNumber.from(expectedAmountOut),
        BigNumber.from(slippage)
      ).toString()
    );

    return { expectedAmountsOut, minAmountsOut };
  };

  // Create one exit path for each output node
  private getExitPaths = (outputNodes: Node[], amountIn: string): Node[][] => {
    const exitPaths = outputNodes.map((outputNode) => {
      const exitPath = [outputNode];
      while (exitPath[0].parent) {
        exitPath.unshift(cloneDeep(exitPath[0].parent));
      }
      /*
      The input/root node requires a real amount (not a reference/index) as it is first node in chain.
      This amount will be used when chaining to children.
      */
      exitPath[0].index = exitPath[exitPath.length - 1].proportionOfParent
        .mul(amountIn)
        .div(WeiPerEther)
        .toString();
      return exitPath;
    });

    /*
    Amounts in for exit paths should be adjusted after caculated to fix eventual rounding issues
    */
    // Sum amountIn for each exit path
    const amountsInSum = exitPaths.reduce((accumulator, currentExitPath) => {
      const amountInForCurrentExitPath = currentExitPath[0].index;
      return BigNumber.from(amountInForCurrentExitPath).add(accumulator);
    }, Zero);
    // Compare total amountIn with sum of calculated amountIn for each exit path
    const amountsInDiff = BigNumber.from(amountIn).sub(amountsInSum);
    // Add diff to last exit path amountIn
    exitPaths[exitPaths.length - 1][0].index = amountsInDiff
      .add(exitPaths[exitPaths.length - 1][0].index)
      .toString();

    return exitPaths;
  };

  private async createCalls(
    exitPaths: Node[][],
    userAddress: string,
    minAmountsOut?: string[],
    authorisation?: string
  ): Promise<{
    callData: string;
    outputIndexes: number[];
    deltas: Record<string, BigNumber>;
  }> {
    const { calls, outputIndexes, deltas } = this.createActionCalls(
      cloneDeep(exitPaths),
      userAddress,
      minAmountsOut
    );

    if (authorisation) {
      calls.unshift(
        Relayer.encodeSetRelayerApproval(this.relayer, true, authorisation)
      );
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
  }

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

  private createActionCalls(
    exitPaths: Node[][],
    userAddress: string,
    minAmountsOut?: string[]
  ): {
    calls: string[];
    outputIndexes: number[];
    deltas: Record<string, BigNumber>;
  } {
    const calls: string[] = [];
    const outputIndexes: number[] = [];
    const isPeek = !minAmountsOut;
    const deltas: Record<string, BigNumber> = {};

    // Create actions for each Node and return in multicall array

    exitPaths.forEach((exitPath, i) => {
      exitPath.forEach((node) => {
        // Calls from root node are sent by the user. Otherwise sent by the relayer
        const isRootNode = !node.parent;
        const sender = isRootNode ? userAddress : this.relayer;
        // Always send to user on output calls otherwise send to relayer
        const exitChild = node.children.find((child) =>
          exitPath.map((n) => n.index).includes(child.index)
        );
        const isLastActionFromExitPath = exitChild?.exitAction === 'output';
        const recipient = isLastActionFromExitPath ? userAddress : this.relayer;
        // Last calls will use minAmountsOut to protect user. Middle calls can safely have 0 minimum as tx will revert if last fails.
        const minAmountOut =
          isLastActionFromExitPath && minAmountsOut ? minAmountsOut[i] : '0';

        switch (node.exitAction) {
          case 'batchSwap': {
            const [call, assets, limits] = this.createBatchSwap(
              node,
              exitChild as Node,
              i,
              minAmountOut,
              sender,
              recipient
            );
            calls.push(call);
            this.updateDeltas(deltas, assets, limits);
            break;
          }
          case 'exitPool': {
            const [call, bptIn, tokensOut, amountsOut] = this.createExitPool(
              node,
              exitChild as Node,
              i,
              minAmountOut,
              sender,
              recipient
            );
            calls.push(call);
            this.updateDeltas(
              deltas,
              [node.address, ...tokensOut],
              [bptIn, ...amountsOut]
            );
            break;
          }
          case 'output':
            if (isPeek) {
              calls.push(
                Relayer.encodePeekChainedReferenceValue(
                  Relayer.toChainedReference(
                    this.getOutputRef(i, node.index),
                    false
                  )
                )
              );
              outputIndexes.push(calls.length - 1);
            }
            break;
          default:
            return;
        }
      });
    });

    return { calls, outputIndexes, deltas };
  }

  private createBatchSwap(
    node: Node,
    exitChild: Node,
    exitPathIndex: number,
    minAmountOut: string,
    sender: string,
    recipient: string
  ): [string, string[], string[]] {
    const isRootNode = !node.parent;
    const amountIn = isRootNode
      ? node.index
      : Relayer.toChainedReference(
          this.getOutputRef(exitPathIndex, node.index)
        ).toString();

    const tokenOut = exitChild.address;
    const assets = [tokenOut, node.address];

    // For tokens going in to the Vault, the limit shall be a positive number. For tokens going out of the Vault, the limit shall be a negative number.
    // First asset will always be the output token so use expectedOut to set limit
    const limits: string[] = [
      BigNumber.from(minAmountOut).mul(-1).toString(),
      Relayer.isChainedReference(amountIn) ? MaxInt256.toString() : amountIn, // We don't know input amounts if they are part of a chain so set to max input
    ];

    // TODO Change to single swap to save gas
    const swaps: BatchSwapStep[] = [
      {
        poolId: node.id,
        assetInIndex: 1,
        assetOutIndex: 0,
        amount: amountIn,
        userData: '0x',
      },
    ];

    const funds: FundManagement = {
      sender,
      recipient,
      fromInternalBalance: false,
      toInternalBalance: false,
    };

    const outputReferences = [
      {
        index: assets
          .map((a) => a.toLowerCase())
          .indexOf(tokenOut.toLowerCase()),
        key: Relayer.toChainedReference(
          this.getOutputRef(exitPathIndex, exitChild.index)
        ),
      },
    ];

    // console.log(
    //   `${node.type} ${node.address} prop: ${formatFixed(
    //     node.proportionOfParent,
    //     18
    //   )}
    //   ${node.exitAction}(
    //     inputAmt: ${amountIn},
    //     inputToken: ${node.address},
    //     pool: ${node.id},
    //     outputToken: ${exitChild.address},
    //     outputRef: ${this.getOutputRef(exitPathIndex, exitChild.index)},
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

    let userTokenOutAmount = limits[0];
    const userBptAmount = limits[1];
    // If the sender is the Relayer the swap is part of a chain and shouldn't be considered for user deltas
    const bptIn = sender === this.relayer ? '0' : userBptAmount;
    // If the receiver is the Relayer the swap is part of a chain and shouldn't be considered for user deltas
    userTokenOutAmount = recipient === this.relayer ? '0' : userTokenOutAmount;
    return [call, assets, [userTokenOutAmount, bptIn]];
  }

  private createExitPool(
    node: Node,
    exitChild: Node,
    exitPathIndex: number,
    minAmountOut: string,
    sender: string,
    recipient: string
  ): [string, string, string[], string[]] {
    const tokenOut = exitChild.address;
    const isRootNode = !node.parent;
    const amountIn = isRootNode
      ? node.index
      : Relayer.toChainedReference(
          this.getOutputRef(exitPathIndex, node.index)
        ).toString();

    const tokensOut: string[] = [];
    const amountsOut: string[] = [];

    // tokensOut needs to include each asset even if it has 0 amount
    node.children.forEach((child) => {
      tokensOut.push(child.address);
      amountsOut.push(child.address === tokenOut ? minAmountOut : '0');
    });

    if (node.type === PoolType.ComposableStable) {
      // assets need to include the phantomPoolToken
      tokensOut.push(node.address);
      // need to add a placeholder so sorting works
      amountsOut.push('0');
    }

    // sort inputs
    const assetHelpers = new AssetHelpers(this.wrappedNativeAsset);
    const [sortedTokens, sortedAmounts] = assetHelpers.sortTokens(
      tokensOut,
      amountsOut
    ) as [string[], string[]];

    // userData amounts should not include the BPT of the pool being joined
    let userDataTokens = [];
    const bptIndex = sortedTokens
      .map((t) => t.toLowerCase())
      .indexOf(node.address.toLowerCase());
    if (bptIndex === -1) {
      userDataTokens = sortedTokens;
    } else {
      userDataTokens = [
        ...sortedTokens.slice(0, bptIndex),
        ...sortedTokens.slice(bptIndex + 1),
      ];
    }

    let userData: string;
    if (node.type === PoolType.Weighted) {
      userData = WeightedPoolEncoder.exitExactBPTInForOneTokenOut(
        amountIn,
        userDataTokens.indexOf(tokenOut)
      );
    } else {
      userData = StablePoolEncoder.exitExactBPTInForOneTokenOut(
        amountIn,
        userDataTokens.indexOf(tokenOut)
      );
    }

    const outputReferences = [
      {
        index: sortedTokens
          .map((t) => t.toLowerCase())
          .indexOf(tokenOut.toLowerCase()),
        key: Relayer.toChainedReference(
          this.getOutputRef(exitPathIndex, exitChild.index)
        ),
      },
    ];

    // console.log(
    //   `${node.type} ${node.address} prop: ${formatFixed(
    //     node.proportionOfParent,
    //     18
    //   )}
    //   ${node.exitAction}(
    //     poolId: ${node.id},
    //     tokensOut: ${sortedTokens},
    //     tokenOut: ${sortedTokens[sortedTokens.indexOf(tokenOut)].toString()},
    //     amountOut: ${sortedAmounts[sortedTokens.indexOf(tokenOut)].toString()},
    //     amountIn: ${amountIn},
    //     minAmountOut: ${minAmountOut},
    //     outputRef: ${this.getOutputRef(exitPathIndex, exitChild.index)},
    //     sender: ${sender},
    //     recipient: ${recipient}
    //   )`
    // );

    const call = Relayer.constructExitCall({
      poolId: node.id,
      poolKind: 0,
      sender,
      recipient,
      outputReferences,
      exitPoolRequest: {} as ExitPoolRequest,
      assets: sortedTokens,
      minAmountsOut: sortedAmounts,
      userData,
      toInternalBalance: false,
    });

    const userAmountTokensOut = sortedAmounts.map((a) =>
      Relayer.isChainedReference(a) ? '0' : Zero.sub(a).toString()
    );
    const userBptIn = Relayer.isChainedReference(amountIn) ? '0' : amountIn;

    return [
      call,
      // If the sender is the Relayer the exit is part of a chain and shouldn't be considered for user deltas
      sender === this.relayer ? Zero.toString() : userBptIn,
      // If the receiver is the Relayer the exit is part of a chain and shouldn't be considered for user deltas
      recipient === this.relayer ? [] : sortedTokens,
      recipient === this.relayer ? [] : userAmountTokensOut,
    ];
  }

  private getOutputRef = (exitPathIndex: number, nodeIndex: string): number => {
    return exitPathIndex * 100 + parseInt(nodeIndex);
  };
}
