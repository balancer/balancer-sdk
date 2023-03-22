import { cloneDeep } from 'lodash';
import { Interface } from '@ethersproject/abi';
import { BigNumber } from '@ethersproject/bignumber';
import { WeiPerEther, Zero } from '@ethersproject/constants';

import { BalancerError, BalancerErrorCode } from '@/balancerErrors';
import { Relayer } from '@/modules/relayer/relayer.module';
import {
  FundManagement,
  SingleSwap,
  Swap,
  SwapType,
} from '@/modules/swaps/types';
import { WeightedPoolEncoder } from '@/pool-weighted';
import { StablePoolEncoder } from '@/pool-stable';
import { BalancerNetworkConfig, ExitPoolRequest, PoolType } from '@/types';
import { PoolGraph, Node } from '../graph/graph';

import { subSlippage } from '@/lib/utils/slippageHelper';
import balancerRelayerAbi from '@/lib/abi/RelayerV4.json';
import { networkAddresses } from '@/lib/constants/config';
import { AssetHelpers } from '@/lib/utils';
import { getPoolAddress } from '@/pool-utils';
import { Join } from '../joins/joins.module';
import { calcPriceImpact } from '../pricing/priceImpact';
import { Simulation, SimulationType } from '../simulation/simulation.module';
import { Requests, VaultModel } from '../vaultModel/vaultModel.module';
import { SwapRequest } from '../vaultModel/poolModel/swap';
import { ExitPoolRequest as ExitPoolModelRequest } from '../vaultModel/poolModel/exit';
import { JsonRpcSigner } from '@ethersproject/providers';

const balancerRelayerInterface = new Interface(balancerRelayerAbi);

export class Exit {
  private wrappedNativeAsset: string;
  private relayer: string;

  constructor(
    private poolGraph: PoolGraph,
    networkConfig: BalancerNetworkConfig,
    private simulationService: Simulation
  ) {
    const { tokens, contracts } = networkAddresses(networkConfig.chainId);
    this.wrappedNativeAsset = tokens.wrappedNativeAsset;
    this.relayer = contracts.relayerV4 as string;
  }

  async exitPool(
    poolId: string,
    amountBptIn: string,
    userAddress: string,
    slippage: string,
    signer: JsonRpcSigner,
    simulationType: SimulationType,
    authorisation?: string
  ): Promise<{
    to: string;
    encodedCall: string;
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
    const orderedNodes = await this.poolGraph.getGraphNodes(false, poolId);

    const isProportional = PoolGraph.isProportionalPools(orderedNodes);
    console.log(`isProportional`, isProportional);

    let exitPaths: Node[][] = [];
    let tokensOutByExitPath: string[] = [];
    let tokensOut: string[] = [];

    const outputNodes = orderedNodes.filter((n) => n.exitAction === 'output');
    tokensOutByExitPath = outputNodes.map((n) => n.address.toLowerCase());
    tokensOut = [...new Set(tokensOutByExitPath)].sort();

    if (isProportional) {
      // All proportional will have single path from root node, exiting proportionally by ref all the way to leafs
      const path = orderedNodes.map((node, i) => {
        if (node.exitAction === 'exitPool') {
          const exitTokens = node.children.map((c) => c.address);
          const exitRefs = node.children.map((c) => c.index);
          const amount = node.index === '0' ? amountBptIn : node.index;
          console.log(
            'ExitPool: ',
            amount,
            exitTokens.toString(),
            exitRefs.toString()
          );
          // replace exitPool action with proportional so correct call is built
          node.exitAction = 'exitPoolProportional';
        } else if (node.exitAction === 'batchSwap') {
          console.log(
            'Swap: ',
            node.address,
            node.index,
            node.children[0].address
          );
        }
        // First node should exit with full BPT amount in
        if (i === 0) node.index = amountBptIn;
        return node;
      });
      exitPaths[0] = path;
      // TODO tokensOut/tokensOutByExitPath might need to be different for this case?
    } else {
      // Create exit paths for each output node and splits amount in proportionally between them
      exitPaths = this.getExitPaths(outputNodes, amountBptIn);
    }

    // Create calls with minimum expected amount out for each exit path
    const {
      multiRequests,
      encodedCall: queryData,
      outputIndexes,
    } = await this.createCalls(
      exitPaths,
      userAddress,
      undefined,
      authorisation
    );

    const expectedAmountsOutByExitPath = await this.amountsOutByExitPath(
      userAddress,
      multiRequests,
      queryData,
      orderedNodes[0].address,
      outputIndexes,
      signer,
      simulationType
    );

    const expectedAmountsOutByTokenOut = this.amountsOutByTokenOut(
      tokensOut,
      tokensOutByExitPath,
      expectedAmountsOutByExitPath
    );

    const { minAmountsOutByExitPath, minAmountsOutByTokenOut } =
      this.minAmountsOut(
        expectedAmountsOutByExitPath,
        expectedAmountsOutByTokenOut,
        slippage
      );

    // Create calls with minimum expected amount out for each exit path
    const { encodedCall, deltas } = await this.createCalls(
      exitPaths,
      userAddress,
      minAmountsOutByExitPath,
      authorisation
    );

    this.assertDeltas(
      poolId,
      deltas,
      amountBptIn,
      tokensOut,
      minAmountsOutByTokenOut
    );

    const priceImpact = await this.calculatePriceImpact(
      poolId,
      this.poolGraph,
      tokensOut,
      expectedAmountsOutByTokenOut,
      amountBptIn
    );

    return {
      to: this.relayer,
      encodedCall,
      tokensOut,
      expectedAmountsOut: expectedAmountsOutByTokenOut,
      minAmountsOut: minAmountsOutByTokenOut,
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
    poolGraph: PoolGraph,
    tokensOut: string[],
    amountsOut: string[],
    amountBptIn: string
  ): Promise<string> {
    // Create nodes for each pool/token interaction and order by breadth first
    const orderedNodesForJoin = await poolGraph.getGraphNodes(true, poolId);
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
    multiRequests: Requests[][],
    callData: string,
    tokenIn: string,
    outputIndexes: number[],
    signer: JsonRpcSigner,
    simulationType: SimulationType
  ): Promise<string[]> => {
    const amountsOutByExitPath =
      await this.simulationService.simulateGeneralisedExit(
        this.relayer,
        multiRequests,
        callData,
        outputIndexes,
        userAddress,
        tokenIn,
        signer,
        simulationType
      );

    return amountsOutByExitPath;
  };

  // Aggregate amounts out by exit path into amounts out by token out
  private amountsOutByTokenOut = (
    tokensOut: string[],
    tokensOutByExitPath: string[],
    expectedAmountsOutByExitPath: string[]
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

    return expectedAmountsOut;
  };

  // Apply slippage tolerance to expected amounts out
  private minAmountsOut = (
    expectedAmountsOutByExitPath: string[],
    expectedAmountsOutByTokenOut: string[],
    slippage: string
  ) => {
    // Apply slippage tolerance on expected amount out for each exit path
    const minAmountsOutByExitPath = expectedAmountsOutByExitPath.map(
      (expectedAmountOut) =>
        subSlippage(
          BigNumber.from(expectedAmountOut),
          BigNumber.from(slippage)
        ).toString()
    );

    // Apply slippage tolerance on expected amount out for each token out
    const minAmountsOutByTokenOut = expectedAmountsOutByTokenOut.map(
      (expectedAmountOut) =>
        subSlippage(
          BigNumber.from(expectedAmountOut),
          BigNumber.from(slippage)
        ).toString()
    );

    return { minAmountsOutByExitPath, minAmountsOutByTokenOut };
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
    multiRequests: Requests[][];
    encodedCall: string;
    outputIndexes: number[];
    deltas: Record<string, BigNumber>;
  }> {
    const { multiRequests, calls, outputIndexes, deltas } =
      this.createActionCalls(cloneDeep(exitPaths), userAddress, minAmountsOut);

    if (authorisation) {
      calls.unshift(
        Relayer.encodeSetRelayerApproval(this.relayer, true, authorisation)
      );
    }

    const encodedCall = balancerRelayerInterface.encodeFunctionData(
      'multicall',
      [calls]
    );

    return {
      multiRequests,
      encodedCall,
      outputIndexes: authorisation
        ? outputIndexes.map((i) => i + 1)
        : outputIndexes,
      deltas,
    };
  }

  private updateDeltas(
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
    multiRequests: Requests[][];
    calls: string[];
    outputIndexes: number[];
    deltas: Record<string, BigNumber>;
  } {
    const multiRequests: Requests[][] = [];
    const calls: string[] = [];
    const outputIndexes: number[] = [];
    const isPeek = !minAmountsOut;
    const deltas: Record<string, BigNumber> = {};

    // Create actions for each Node and return in multicall array

    exitPaths.forEach((exitPath, i) => {
      const modelRequests: Requests[] = [];
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
            const { modelRequest, encodedCall, assets, amounts } =
              this.createSwap(
                node,
                exitChild as Node,
                i,
                minAmountOut,
                sender,
                recipient
              );
            modelRequests.push(modelRequest);
            calls.push(encodedCall);
            this.updateDeltas(deltas, assets, amounts);
            break;
          }
          case 'exitPool': {
            const { modelRequest, encodedCall, bptIn, tokensOut, amountsOut } =
              this.createExitPool(
                node,
                exitChild as Node,
                i,
                minAmountOut,
                sender,
                recipient
              );
            modelRequests.push(modelRequest);
            calls.push(encodedCall);
            this.updateDeltas(
              deltas,
              [node.address, ...tokensOut],
              [bptIn, ...amountsOut]
            );
            break;
          }
          case 'exitPoolProportional': {
            console.log('TODO - Create exitProportional Call !!!!!!!');
            // modelRequests.push(modelRequest);
            // calls.push(encodedCall);
            // this.updateDeltas(
            //   deltas,
            //   [node.address, ...tokensOut],
            //   [bptIn, ...amountsOut]
            // );
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
      multiRequests.push(modelRequests);
    });

    return { multiRequests, calls, outputIndexes, deltas };
  }

  private createSwap(
    node: Node,
    exitChild: Node,
    exitPathIndex: number,
    minAmountOut: string,
    sender: string,
    recipient: string
  ): {
    modelRequest: SwapRequest;
    encodedCall: string;
    assets: string[];
    amounts: string[];
  } {
    const isRootNode = !node.parent;
    const amountIn = isRootNode
      ? node.index
      : Relayer.toChainedReference(
          this.getOutputRef(exitPathIndex, node.index)
        ).toString();

    const tokenOut = exitChild.address;
    const assets = [tokenOut, node.address];

    // Single swap limits are always positive
    // Swap within generalisedExit is always exactIn, so use minAmountOut to set limit
    const limit: string = minAmountOut;

    const request: SingleSwap = {
      poolId: node.id,
      kind: SwapType.SwapExactIn,
      assetIn: node.address,
      assetOut: tokenOut,
      amount: amountIn,
      userData: '0x',
    };

    const funds: FundManagement = {
      sender,
      recipient,
      fromInternalBalance: this.receivesFromInternal(node),
      toInternalBalance: this.receivesFromInternal(exitChild),
    };

    const outputReference = Relayer.toChainedReference(
      this.getOutputRef(exitPathIndex, exitChild.index)
    );

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

    const call: Swap = {
      request,
      funds,
      limit,
      deadline: BigNumber.from(Math.ceil(Date.now() / 1000) + 3600), // 1 hour from now
      value: '0', // TODO: check if swap with ETH is possible in this case and handle it
      outputReference,
    };

    const encodedCall = Relayer.encodeSwap(call);

    const modelRequest = VaultModel.mapSwapRequest(call);

    // If node isn't rootNode, the swap is part of a chain and shouldn't be considered for user deltas
    const bptIn = !isRootNode ? '0' : amountIn;
    // If child exit action is not output, the swap is part of a chain and shouldn't be considered for user deltas
    const userTokenOutAmount =
      exitChild.exitAction !== 'output'
        ? '0'
        : BigNumber.from(minAmountOut).mul(-1).toString(); // needs to be negative because it's handled by the vault model as an amount going out of the vault
    const amounts = [userTokenOutAmount, bptIn];

    return { modelRequest, encodedCall, assets, amounts };
  }

  private createExitPool(
    node: Node,
    exitChild: Node,
    exitPathIndex: number,
    minAmountOut: string,
    sender: string,
    recipient: string
  ): {
    modelRequest: ExitPoolModelRequest;
    encodedCall: string;
    bptIn: string;
    tokensOut: string[];
    amountsOut: string[];
  } {
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

    const call = Relayer.formatExitPoolInput({
      poolId: node.id,
      poolKind: 0,
      sender,
      recipient,
      outputReferences,
      exitPoolRequest: {} as ExitPoolRequest,
      assets: sortedTokens,
      minAmountsOut: sortedAmounts,
      userData,
      toInternalBalance: this.receivesFromInternal(exitChild),
    });
    const encodedCall = Relayer.encodeExitPool(call);
    const modelRequest = VaultModel.mapExitPoolRequest(call);

    const userAmountTokensOut = sortedAmounts.map((a) =>
      Relayer.isChainedReference(a) ? '0' : Zero.sub(a).toString()
    );
    const userBptIn = Relayer.isChainedReference(amountIn) ? '0' : amountIn;
    // If node isn't rootNode, the exit is part of a chain and shouldn't be considered for user deltas
    const deltaBptIn = !isRootNode ? Zero.toString() : userBptIn;
    // // If child exit action is not output, the exit is part of a chain and shouldn't be considered for user deltas
    const deltaTokensOut =
      exitChild.exitAction !== 'output' ? [] : sortedTokens;
    const deltaAmountsOut =
      exitChild.exitAction !== 'output' ? [] : userAmountTokensOut;

    return {
      modelRequest,
      encodedCall,
      bptIn: deltaBptIn,
      tokensOut: deltaTokensOut,
      amountsOut: deltaAmountsOut,
    };
  }

  private getOutputRef = (exitPathIndex: number, nodeIndex: string): number => {
    return exitPathIndex * 100 + parseInt(nodeIndex);
  };

  // node without parent is the root node and it receives from non-internal balance
  // exitPool always expects amounts from non-internal balance
  // output always behave as receiving from non-internal balance
  // others should always receive from internal balance
  private receivesFromInternal = (node: Node): boolean => {
    if (!node.parent) return false;
    return node.exitAction !== 'output' && node.exitAction !== 'exitPool';
  };
}
