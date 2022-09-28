import { defaultAbiCoder } from '@ethersproject/abi';
import { cloneDeep } from 'lodash';
import { Interface } from '@ethersproject/abi';
import { BigNumber } from '@ethersproject/bignumber';
import { MaxInt256, WeiPerEther, Zero } from '@ethersproject/constants';

import { BalancerError, BalancerErrorCode } from '@/balancerErrors';
import { Relayer } from '@/modules/relayer/relayer.module';
import { BatchSwapStep, FundManagement, SwapType } from '@/modules/swaps/types';
import { StablePoolEncoder } from '@/pool-stable';
import { ExitPoolRequest, PoolType } from '@/types';
import { PoolRepository } from '../data';
import { PoolGraph, Node } from '../joins/graph';

import { subSlippage } from '@/lib/utils/slippageHelper';
import balancerRelayerAbi from '@/lib/abi/BalancerRelayer.json';
import { networkAddresses } from '@/lib/constants/config';
import { AssetHelpers } from '@/lib/utils';
const balancerRelayerInterface = new Interface(balancerRelayerAbi);

export class Exit {
  private outputIndexes: number[] = [];
  private tokensOut: string[] = [];
  private tokensOutByExitPath: string[] = [];
  private wrappedNativeAsset: string;
  private relayer: string;

  constructor(private pools: PoolRepository, private chainId: number) {
    const { tokens, contracts } = networkAddresses(chainId);
    this.wrappedNativeAsset = tokens.wrappedNativeAsset;
    this.relayer = contracts.relayer as string;
  }

  async exitPool(
    poolId: string,
    amountIn: string,
    userAddress: string,
    minAmountsOut?: string[],
    authorisation?: string
  ): Promise<{
    to: string;
    callData: string;
    tokensOut: string[];
    decodeOutputInfo: (
      staticCallResult: string,
      slippage: string
    ) => {
      expectedAmountsOut: string[];
      minAmountsOut: string[];
    };
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
    const orderedNodes = await this.getGraphNodes(poolId);

    // Create exit paths for each output node and splits amount in proportionally between them
    const outputNodes = orderedNodes.filter((n) => n.exitAction === 'output');
    const exitPaths = this.getExitPaths(outputNodes, amountIn);

    this.tokensOutByExitPath = outputNodes.map((n) => n.address);
    this.tokensOut = [...new Set(this.tokensOutByExitPath)];

    // Split minAmountsOut proportionally in case there is more than one exit path for the same token out
    const tokenOutProportions: Record<string, BigNumber> = {};
    outputNodes.forEach(
      (node) =>
        (tokenOutProportions[node.address] = (
          tokenOutProportions[node.address] ?? Zero
        ).add(node.proportionOfParent))
    );
    const minAmountsOutByExitPath = minAmountsOut?.map((minAmountOut, i) =>
      BigNumber.from(minAmountOut)
        .mul(outputNodes[i].proportionOfParent)
        .div(tokenOutProportions[outputNodes[i].address])
        .toString()
    );

    // Create calls with 0 expected for each exit amount
    const query = await this.createCalls(
      exitPaths,
      userAddress,
      minAmountsOutByExitPath,
      authorisation
    );

    this.outputIndexes = query.outputIndexes;

    return {
      to: this.relayer,
      callData: query.callData,
      tokensOut: this.tokensOut,
      decodeOutputInfo: (staticCallResult: string, slippage: string) => {
        // Decode each exit path amount out from static call result
        const multiCallResult = defaultAbiCoder.decode(
          ['bytes[]'],
          staticCallResult
        )[0] as string[];
        const amountsOutByExitPath = this.outputIndexes.map((outputIndex) => {
          const result = defaultAbiCoder.decode(
            ['uint256'],
            multiCallResult[outputIndex]
          );
          return result.toString();
        });

        // Aggregate amountsOutByExitPath into expectedAmountsOut
        const expectedAmountsOutMap: Record<string, BigNumber> = {};
        this.tokensOutByExitPath.forEach(
          (tokenOut, i) =>
            (expectedAmountsOutMap[tokenOut] = (
              expectedAmountsOutMap[tokenOut] ?? Zero
            ).add(amountsOutByExitPath[i]))
        );
        const expectedAmountsOut = this.tokensOut.map((tokenOut) =>
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
      },
    };
  }

  // Get full graph from root pool and return ordered nodes
  async getGraphNodes(poolId: string): Promise<Node[]> {
    const rootPool = await this.pools.find(poolId);
    if (!rootPool) throw new BalancerError(BalancerErrorCode.POOL_DOESNT_EXIST);
    const poolsGraph = new PoolGraph(this.pools);

    // should always exit to main tokens, so wrapMainTokens is always false
    const rootNode = await poolsGraph.buildGraphFromRootPool(poolId, false);

    if (rootNode.type !== PoolType.ComposableStable) {
      throw new Error('root pool type should be ComposableStable');
    }

    if (rootNode.id !== poolId) throw new Error('Error creating graph nodes');

    const orderedNodes = PoolGraph.orderByBfs(rootNode);
    return orderedNodes;
  }

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

    // Sum amountIn for each exit path
    const amountsInSum = exitPaths.reduce((accumulator, currentExitPath) => {
      const amountInForCurrentExitPath = currentExitPath[0].index;
      return BigNumber.from(amountInForCurrentExitPath).add(accumulator);
    }, Zero);
    // Compare total amountIn with sum of calculated amountIn for each exit path
    const amountsInDiff = BigNumber.from(amountIn).sub(amountsInSum);
    // Add diff to amountIn from last exit path
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
  }> {
    const { calls, outputIndexes } = this.createActionCalls(
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
    };
  }

  private createActionCalls(
    exitPaths: Node[][],
    userAddress: string,
    minAmountsOut?: string[]
  ): { calls: string[]; outputIndexes: number[] } {
    const calls: string[] = [];
    const outputIndexes: number[] = [];
    const isPeek = !minAmountsOut;
    // Create actions for each Node and return in multicall array

    exitPaths.forEach((exitPath, i) => {
      exitPath.forEach((node, j) => {
        // Calls from root node are sent by the user. Otherwise sent by the relayer
        // const isRootNode = j === 0;
        // const sender = isRootNode ? userAddress : this.relayer;
        const sender = userAddress; // FIXME: temporary workaround until we don't figure out why the intended behavior isn't working as expected
        // Always send to user on output calls otherwise send to relayer
        const isLastActionFromExitPath = node.children.some(
          (child) => child.exitAction === 'output'
        );
        // const recipient = isOutputNode ? userAddress : this.relayer;
        const recipient = userAddress; // FIXME: temporary workaround until we don't figure out why the intended behavior isn't working as expected
        // Last calls will use minAmountsOut to protect user. Middle calls can safely have 0 minimum as tx will revert if last fails.
        const minAmountOut =
          isLastActionFromExitPath && minAmountsOut ? minAmountsOut[i] : '0';

        switch (node.exitAction) {
          case 'batchSwap':
            if (node.type.includes('Linear')) {
              // linear pools should exit by swapping to the mainToken only
              calls.push(
                this.createBatchSwap(
                  node,
                  exitPath,
                  i,
                  minAmountOut,
                  sender,
                  recipient
                )
              );
            } else {
              // other pools (e.g. StablePhantom) should exit by swapping to each child token proportionaly based on its proportionOfParent
              // TODO: check if this needs to be implemented
            }
            break;
          case 'exitPool':
            if (node.type === PoolType.ComposableStable) {
              // !!! ComposableStables do not have Proportional Exit method !!!
              calls.push(
                this.createExitPool(
                  node,
                  exitPath,
                  i,
                  minAmountOut,
                  sender,
                  recipient
                )
              );
            } else {
              // exit to all tokens in a single exit call
              // TODO: check if this needs to be implemented
            }
            break;
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

    return { calls, outputIndexes };
  }

  private createBatchSwap(
    node: Node,
    exitPath: Node[],
    exitPathIndex: number,
    minAmountOut: string,
    sender: string,
    recipient: string
  ): string {
    // We only need batchSwaps for main/wrapped > linearBpt so shouldn't be more than token > token
    if (node.children.length !== 1) throw new Error('Unsupported batchswap');

    const exitChild = node.children.find((child) =>
      exitPath.map((n) => n.index).includes(child.index)
    ) as Node;
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
    // We don't know input amounts if they are part of a chain so set to max input
    // TODO can we be safer?
    const limits: string[] = [
      BigNumber.from(minAmountOut).mul(-1).toString(),
      MaxInt256.toString(),
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
      fromInternalBalance: sender === this.relayer,
      toInternalBalance: recipient === this.relayer,
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
    //     outputRef: ${this.getOutputRef(exitPathIndex, exitChild.index)}
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

  private createExitPool(
    node: Node,
    exitPath: Node[],
    exitPathIndex: number,
    minAmountOut: string,
    sender: string,
    recipient: string
  ): string {
    const exitChild = node.children.find((child) =>
      exitPath.map((n) => n.index).includes(child.index)
    ) as Node;
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

    const userData = StablePoolEncoder.exitExactBPTInForOneTokenOut(
      amountIn,
      userDataTokens.indexOf(tokenOut)
    );

    // TODO: check if it's not necessary to define all outputReferences even for outputs with zero amounts
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
    //     outputRef: ${this.getOutputRef(exitPathIndex, exitChild.index)}
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
      toInternalBalance: recipient === this.relayer,
    });

    return call;
  }

  private getOutputRef = (exitPathIndex: number, nodeIndex: string): number => {
    return exitPathIndex * 100 + parseInt(nodeIndex);
  };
}
