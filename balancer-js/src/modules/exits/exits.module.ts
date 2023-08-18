import { cloneDeep } from 'lodash';
import { BigNumber } from '@ethersproject/bignumber';
import { WeiPerEther, Zero } from '@ethersproject/constants';
import { JsonRpcSigner } from '@ethersproject/providers';

import { BalancerError, BalancerErrorCode } from '@/balancerErrors';
import { BalancerRelayer__factory } from '@/contracts/factories/BalancerRelayer__factory';
import { networkAddresses } from '@/lib/constants/config';
import { AssetHelpers, subSlippage } from '@/lib/utils';
import { PoolGraph, Node } from '@/modules/graph/graph';
import { Join } from '@/modules/joins/joins.module';
import { calcPriceImpact } from '@/modules/pricing/priceImpact';
import {
  EncodeUnwrapInput,
  OutputReference,
  Relayer,
  EncodeBatchSwapInput,
} from '@/modules/relayer/relayer.module';
import {
  Simulation,
  SimulationType,
} from '@/modules/simulation/simulation.module';
import {
  FundManagement,
  SingleSwap,
  Swap,
  SwapType,
  BatchSwapStep,
} from '@/modules/swaps/types';
import { ExitPoolRequest as ExitPoolModelRequest } from '@/modules/vaultModel/poolModel/exit';
import {
  BatchSwapRequest,
  SwapRequest,
} from '@/modules/vaultModel/poolModel/swap';
import { UnwrapRequest } from '@/modules/vaultModel/poolModel/unwrap';
import { Requests, VaultModel } from '@/modules/vaultModel/vaultModel.module';
import { ComposableStablePoolEncoder } from '@/pool-composable-stable';
import { StablePoolEncoder } from '@/pool-stable';
import { getPoolAddress } from '@/pool-utils';
import { WeightedPoolEncoder } from '@/pool-weighted';
import { BalancerNetworkConfig, ExitPoolRequest, PoolType } from '@/types';
import { Logger } from '@/lib/utils/logger';

const balancerRelayerInterface = BalancerRelayer__factory.createInterface();

export interface GeneralisedExitOutput {
  to: string;
  encodedCall: string;
  tokensOut: string[];
  expectedAmountsOut: string[];
  minAmountsOut: string[];
  priceImpact: string;
}

export interface ExitInfo {
  tokensOut: string[];
  estimatedAmountsOut: string[];
  priceImpact: string;
  tokensToUnwrap: string[];
}

// Quickly switch useful debug logs on/off
const DEBUG = false;

function debugLog(log: string) {
  const logger = Logger.getInstance();
  if (DEBUG) logger.info(log);
}

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
    this.relayer = contracts.balancerRelayer;
  }

  async getExitInfo(
    poolId: string,
    amountBptIn: string,
    userAddress: string,
    signer: JsonRpcSigner
  ): Promise<{
    tokensOut: string[];
    estimatedAmountsOut: string[];
    priceImpact: string;
    tokensToUnwrap: string[];
  }> {
    debugLog(`\n--- getExitInfo()`);
    /*
    Overall exit flow description:
    - Create calls with 0 expected min amount for each token out
    - static call (or V4 special call) to get actual amounts for each token out
    - Apply slippage to amountsOut
    - Recreate calls with minAmounts === actualAmountsWithSlippage
    - Return minAmoutsOut, UI would use this to display to user
    - Return updatedCalls, UI would use this to execute tx
    */
    const exit = await this.getExit(
      poolId,
      amountBptIn,
      userAddress,
      signer,
      [],
      SimulationType.VaultModel
    );

    return {
      tokensOut: exit.tokensOut,
      estimatedAmountsOut: exit.expectedAmountsOut,
      priceImpact: exit.priceImpact,
      tokensToUnwrap: exit.tokensToUnwrap,
    };
  }

  async buildExitCall(
    poolId: string,
    amountBptIn: string,
    userAddress: string,
    slippage: string,
    signer: JsonRpcSigner,
    simulationType: SimulationType.Static | SimulationType.Tenderly,
    authorisation?: string,
    tokensToUnwrap?: string[]
  ): Promise<{
    to: string;
    encodedCall: string;
    tokensOut: string[];
    expectedAmountsOut: string[];
    minAmountsOut: string[];
    priceImpact: string;
  }> {
    debugLog(
      `\n--- exitPool(): simulationType: ${simulationType} - tokensToUnwrap: ${tokensToUnwrap}`
    );
    /*
    Overall exit flow description:
    - Create calls with 0 expected min amount for each token out
    - static call (or V4 special call) to get actual amounts for each token out
    - Apply slippage to amountsOut
    - Recreate calls with minAmounts === actualAmountsWithSlippage
    - Return minAmoutsOut, UI would use this to display to user
    - Return updatedCalls, UI would use this to execute tx
    */

    const exit = await this.getExit(
      poolId,
      amountBptIn,
      userAddress,
      signer,
      tokensToUnwrap ?? [],
      simulationType,
      authorisation
    );

    const { minAmountsOutByExitPath, minAmountsOutByTokenOut } =
      this.minAmountsOut(
        exit.expectedAmountsOutByExitPath,
        exit.expectedAmountsOut,
        slippage
      );

    debugLog(`------------ Updating limits...`);
    // Create calls with minimum expected amount out for each exit path
    const { encodedCall, deltas } = await this.createCalls(
      exit.exitPaths,
      userAddress,
      exit.isProportional,
      minAmountsOutByExitPath,
      authorisation
    );

    this.assertDeltas(
      poolId,
      deltas,
      amountBptIn,
      exit.tokensOut,
      minAmountsOutByTokenOut
    );

    return {
      to: this.relayer,
      encodedCall,
      tokensOut: exit.tokensOut,
      expectedAmountsOut: exit.expectedAmountsOut,
      minAmountsOut: minAmountsOutByTokenOut,
      priceImpact: exit.priceImpact,
    };
  }

  private async getExit(
    poolId: string,
    amountBptIn: string,
    userAddress: string,
    signer: JsonRpcSigner,
    tokensToUnwrap: string[],
    simulationType: SimulationType,
    authorisation?: string
  ): Promise<{
    tokensToUnwrap: string[];
    tokensOut: string[];
    exitPaths: Node[][];
    isProportional: boolean;
    expectedAmountsOut: string[];
    expectedAmountsOutByExitPath: string[];
    priceImpact: string;
  }> {
    // Create nodes and order by breadth first - initially trys with no unwrapping
    const orderedNodes = await this.poolGraph.getGraphNodes(
      false,
      poolId,
      tokensToUnwrap
    );

    const isProportional = PoolGraph.isProportionalPools(orderedNodes);
    debugLog(`\nisProportional = ${isProportional}`);

    let exitPaths: Node[][] = [];
    let tokensOutByExitPath: string[] = [];
    let tokensOut: string[] = [];

    const outputNodes = orderedNodes.filter((n) => n.exitAction === 'output');
    tokensOutByExitPath = outputNodes.map((n) => n.address.toLowerCase());

    tokensOut = [...new Set(tokensOutByExitPath)].sort();

    if (isProportional) {
      // All proportional will have single path from root node, exiting proportionally by ref all the way to leafs
      const path = orderedNodes.map((node, i) => {
        // First node should exit with full BPT amount in
        if (i === 0) node.index = amountBptIn;
        return node;
      });
      exitPaths[0] = path;
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
      isProportional,
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

    const tokensWithInsufficientBalance = outputNodes
      .filter((outputNode, i) =>
        BigNumber.from(expectedAmountsOutByExitPath[i]).gt(outputNode.balance)
      )
      .map((node) => node.address.toLowerCase());

    if (
      tokensToUnwrap.some((t) =>
        tokensWithInsufficientBalance.includes(t.toLowerCase())
      )
    ) {
      /**
       * This means there is not enough balance to exit to main or wrapped tokens only
       */
      throw new Error(
        'Insufficient pool balance to perform generalised exit - try exitting with smaller amounts'
      );
    } else if (tokensWithInsufficientBalance.length > 0) {
      return await this.getExit(
        poolId,
        amountBptIn,
        userAddress,
        signer,
        [...new Set(tokensWithInsufficientBalance)].sort(),
        simulationType,
        authorisation
      );
    } else {
      const expectedAmountsOut = this.amountsOutByTokenOut(
        tokensOut,
        tokensOutByExitPath,
        expectedAmountsOutByExitPath
      );

      const priceImpact = await this.calculatePriceImpact(
        poolId,
        this.poolGraph,
        tokensOut,
        expectedAmountsOut,
        amountBptIn
      );

      return {
        tokensToUnwrap,
        tokensOut,
        exitPaths,
        isProportional,
        expectedAmountsOut,
        expectedAmountsOutByExitPath,
        priceImpact,
      };
    }
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
    const orderedNodesForJoin = await poolGraph.getGraphNodes(true, poolId, []);
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
    isProportional: boolean,
    minAmountsOut?: string[],
    authorisation?: string
  ): Promise<{
    multiRequests: Requests[][];
    encodedCall: string;
    outputIndexes: number[];
    deltas: Record<string, BigNumber>;
  }> {
    const { multiRequests, calls, outputIndexes, deltas } =
      this.createActionCalls(
        cloneDeep(exitPaths),
        userAddress,
        isProportional,
        minAmountsOut
      );

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
    isProportional: boolean,
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

    const getSenderAddress = (exitPath: Node[], node: Node) => {
      // Calls from root node are sent by the user
      if (!node.parent) return userAddress;
      // Otherwise sent by the parent's recipient
      return getRecipientAddress(exitPath, node.parent);
    };

    const getRecipientAddress = (exitPath: Node[], node: Node) => {
      // Always send to user on calls that contain outputs, otherwise send to relayer
      const exitChildren = node.children.filter((child) =>
        exitPath.map((n) => n.index).includes(child.index)
      );
      const hasOutputChild = exitChildren.some(
        (c) => c.exitAction === 'output'
      );
      return hasOutputChild ? userAddress : this.relayer;
    };

    // Create actions for each Node and return in multicall array

    exitPaths.forEach((exitPath, i) => {
      const modelRequests: Requests[] = [];
      const outputNodes = exitPath.filter(
        (node) => node.exitAction === 'output'
      );
      exitPath.forEach((node) => {
        // Find the exit child node
        const exitChild = node.children.find((child) =>
          exitPath.map((n) => n.index).includes(child.index)
        );

        const sender = getSenderAddress(exitPath, node);
        const recipient = getRecipientAddress(exitPath, node);

        const exitChildren = node.children.filter((child) =>
          exitPath.map((n) => n.index).includes(child.index)
        );
        // An action that has either outputs or unwraps as child actions is the last action where we're able to set limits on expected output amounts
        const isLastActionWithLimits = exitChildren.some(
          (c) => c.exitAction === 'output' || c.exitAction === 'unwrap'
        );

        // Last calls will use minAmountsOut to protect user. Middle calls can safely have 0 minimum as tx will revert if last fails.
        let minAmountOut = '0';
        const minAmountsOutProportional = Array(node.children.length).fill('0');
        if (minAmountsOut && isLastActionWithLimits) {
          if (isProportional) {
            // Proportional exits have a minAmountOut for each output node within a single exit path

            /**
             * minAmountsOut is related to the whole multicall transaction, while
             * minAmountsOutProportional is related only to the current node/transaction
             * This section is responsible for mapping each minAmountOut to their
             * respective position on the minAmountsOutProportional array
             * TODO: extract to a function so it's easier to understand
             */
            node.children.forEach((child, i) => {
              let outputChildIndex: number;
              if (child.exitAction === 'unwrap') {
                outputChildIndex = outputNodes.indexOf(child.children[0]);
                minAmountOut = WeiPerEther.mul(minAmountsOut[outputChildIndex])
                  .div(child.priceRate)
                  .toString();
              } else if (child.exitAction === 'output') {
                outputChildIndex = outputNodes.indexOf(child);
                minAmountOut = minAmountsOut[outputChildIndex];
              } else {
                minAmountOut = '0'; // clears minAmountOut if it's not an output or unwrap
              }
              minAmountsOutProportional[i] = minAmountOut;
            });
          } else {
            // Non-proportional exits have a minAmountOut for each exit path
            if (exitChild?.exitAction === 'unwrap') {
              minAmountOut = WeiPerEther.mul(minAmountsOut[i])
                .div(exitChild.priceRate)
                .toString();
            } else {
              minAmountOut = minAmountsOut[i];
            }
          }
        }

        switch (node.exitAction) {
          case 'unwrap': {
            const { modelRequest, encodedCall, assets, amounts } =
              this.createUnwrap(
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
            let exit;
            if (isProportional) {
              exit = this.createExitPoolProportional(
                node,
                minAmountsOutProportional,
                sender,
                recipient
              );
            } else {
              exit = this.createExitPool(
                node,
                exitChild as Node,
                i,
                minAmountOut,
                sender,
                recipient
              );
            }
            const { modelRequest, encodedCall, bptIn, tokensOut, amountsOut } =
              exit;
            modelRequests.push(modelRequest);
            calls.push(encodedCall);
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
      multiRequests.push(modelRequests);
    });

    return { multiRequests, calls, outputIndexes, deltas };
  }

  private createUnwrap = (
    node: Node,
    exitChild: Node,
    exitPathIndex: number,
    minAmountOut: string,
    sender: string,
    recipient: string
  ): {
    modelRequest: UnwrapRequest;
    encodedCall: string;
    assets: string[];
    amounts: string[];
  } => {
    const amount = Relayer.toChainedReference(
      this.getOutputRef(exitPathIndex, node.index)
    ).toString();
    const outputReference = Relayer.toChainedReference(
      this.getOutputRef(exitPathIndex, exitChild.index)
    );

    const linearPoolType = node.parent?.type as string;

    const call: EncodeUnwrapInput = {
      wrappedToken: node.address,
      sender,
      recipient,
      amount,
      outputReference,
    };

    const encodedCall = Relayer.encodeUnwrap(call, linearPoolType);

    debugLog(`linear type: , ${linearPoolType}`);
    debugLog('\nUwrap:');
    debugLog(JSON.stringify(call));

    const modelRequest = VaultModel.mapUnwrapRequest(
      amount,
      outputReference,
      node.parent?.id as string // linear pool id
    );

    const assets = [exitChild.address];
    const amounts = [Zero.sub(minAmountOut).toString()]; // needs to be negative because it's handled by the vault model as an amount going out of the vault
    return { modelRequest, encodedCall, assets, amounts };
  };

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

    const fromInternalBalance = this.receivesFromInternal(node);
    const toInternalBalance = this.receivesFromInternal(exitChild);

    const funds: FundManagement = {
      sender,
      recipient,
      fromInternalBalance,
      toInternalBalance,
    };

    const outputReference = Relayer.toChainedReference(
      this.getOutputRef(exitPathIndex, exitChild.index)
    );

    const call: Swap = {
      request,
      funds,
      limit,
      deadline: BigNumber.from(Math.ceil(Date.now() / 1000) + 3600), // 1 hour from now
      value: '0', // TODO: check if swap with ETH is possible in this case and handle it
      outputReference,
    };
    debugLog('\nSwap:');
    debugLog(JSON.stringify(call));

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

  private createBatchSwap(
    node: Node,
    exitChildren: Node[],
    exitPathIndex: number,
    minAmountsOut: string[],
    sender: string,
    recipient: string
  ): {
    modelRequest: BatchSwapRequest;
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

    const tokensOut = exitChildren.map((n) => n.address);
    const assets = [...tokensOut, node.address];
    // TODO - setting these right?
    const limits = [...minAmountsOut];
    limits.push(amountIn);
    const batchSwapSteps: BatchSwapStep[] = [];
    const outputReferences: OutputReference[] = [];
    exitChildren.forEach((child, i) => {
      // TODO - Is this correct?
      const amount = child.proportionOfParent
        .mul(amountIn)
        .div(WeiPerEther)
        .toString();
      const swapStep: BatchSwapStep = {
        poolId: node.id,
        assetInIndex: assets.length - 1,
        assetOutIndex: i,
        amount,
        userData: '0x',
      };
      batchSwapSteps.push(swapStep);
      // TODO - Is this right?
      outputReferences.push({
        index: i,
        key: Relayer.toChainedReference(this.getOutputRef(0, child.index)),
      });
    });

    const total = batchSwapSteps.reduce((acc, swap) => {
      return acc.add(swap.amount);
    }, BigNumber.from(0));
    const dust = BigNumber.from(amountIn).sub(total);
    batchSwapSteps[0].amount = dust.add(batchSwapSteps[0].amount).toString();

    const fromInternalBalance = this.receivesFromInternal(node);
    // TODO - This is assuming that all exit to same, is this right?
    const toInternalBalance = this.receivesFromInternal(exitChildren[0]);

    const funds: FundManagement = {
      sender,
      recipient,
      fromInternalBalance,
      toInternalBalance,
    };

    const call: EncodeBatchSwapInput = {
      swapType: SwapType.SwapExactIn,
      swaps: batchSwapSteps,
      assets,
      funds,
      limits,
      deadline: BigNumber.from(Math.ceil(Date.now() / 1000) + 3600), // 1 hour from now
      value: '0', // TODO: check if swap with ETH is possible in this case and handle it
      outputReferences,
    };
    debugLog('\nBatchSwap:');
    debugLog(JSON.stringify(call));

    const encodedCall = Relayer.encodeBatchSwap(call);

    const modelRequest = VaultModel.mapBatchSwapRequest(call);

    // If node isn't rootNode, the swap is part of a chain and shouldn't be considered for user deltas
    const bptIn = !isRootNode ? '0' : amountIn;
    // If child exit action is not output, the swap is part of a chain and shouldn't be considered for user deltas
    const userTokensOut = exitChildren.map((child, i) => {
      const userTokenOutAmount =
        child.exitAction !== 'output'
          ? '0'
          : BigNumber.from(minAmountsOut[i]).mul(-1).toString(); // needs to be negative because it's handled by the vault model as an amount going out of the vault
      return userTokenOutAmount;
    });

    const amounts = [...userTokensOut, bptIn];

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

    const toInternalBalance = this.receivesFromInternal(exitChild);

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
      toInternalBalance,
    });
    debugLog('\nExit:');
    debugLog(JSON.stringify(call));

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

  private createExitPoolProportional(
    node: Node,
    minAmountsOut: string[],
    sender: string,
    recipient: string
  ): {
    modelRequest: ExitPoolModelRequest;
    encodedCall: string;
    bptIn: string;
    tokensOut: string[];
    amountsOut: string[];
  } {
    const isRootNode = !node.parent;
    const amountIn = isRootNode
      ? node.index
      : Relayer.toChainedReference(this.getOutputRef(0, node.index)).toString();

    const tokensOut = node.children.map((child) => child.address);
    const amountsOut = [...minAmountsOut];

    if (node.type === PoolType.ComposableStable) {
      // assets need to include the phantomPoolToken
      tokensOut.push(node.address);
      // need to add a placeholder so sorting works
      amountsOut.push('0');
    }

    // TODO: we shoule consider let the graph handle sorting instead of manipulating
    // token order within actions - specially now that we have different sorting
    // cases and that the subgraph is already handling them properly

    // sort inputs
    const assetHelpers = new AssetHelpers(this.wrappedNativeAsset);
    const [sortedTokens, sortedAmounts] = assetHelpers.sortTokens(
      tokensOut,
      amountsOut
    ) as [string[], string[]];

    let userData: string;
    if (node.type === PoolType.Weighted) {
      userData = WeightedPoolEncoder.exitExactBPTInForTokensOut(amountIn);
    } else if (node.type === PoolType.ComposableStable) {
      userData =
        ComposableStablePoolEncoder.exitExactBPTInForAllTokensOut(amountIn);
    } else {
      // TODO: double check if it's ok to set the Stable Pool Encoder as the default/else case
      userData = StablePoolEncoder.exitExactBPTInForTokensOut(amountIn);
    }

    const outputReferences = node.children.map((child) => {
      return {
        index: sortedTokens
          .map((t) => t.toLowerCase())
          .indexOf(child.address.toLowerCase()),
        key: Relayer.toChainedReference(this.getOutputRef(0, child.index)),
      };
    });
    // We have to use correct pool type based off following from Relayer:
    // enum PoolKind { WEIGHTED, LEGACY_STABLE, COMPOSABLE_STABLE, COMPOSABLE_STABLE_V2 }
    // (note only Weighted and COMPOSABLE_STABLE_V2 will support proportional exits)
    let kind = 0;
    if (node.type === PoolType.ComposableStable) {
      kind = 3;
    }

    const allChildrenReceiveFromInternal = node.children.every((child) =>
      this.receivesFromInternal(child)
    );

    const call = Relayer.formatExitPoolInput({
      poolId: node.id,
      poolKind: kind,
      sender,
      recipient,
      outputReferences,
      exitPoolRequest: {} as ExitPoolRequest,
      assets: sortedTokens,
      minAmountsOut: sortedAmounts,
      userData,
      toInternalBalance: allChildrenReceiveFromInternal,
    });
    debugLog('\nExitProportional:');
    debugLog(JSON.stringify(call));
    const encodedCall = Relayer.encodeExitPool(call);
    const modelRequest = VaultModel.mapExitPoolRequest(call);

    const userAmountTokensOut = sortedAmounts.map((a) =>
      Relayer.isChainedReference(a) ? '0' : Zero.sub(a).toString()
    );
    const userBptIn = Relayer.isChainedReference(amountIn) ? '0' : amountIn;
    // If current node is the root node the exit the delta BPT in should be considered for user deltas
    const deltaBptIn = isRootNode ? userBptIn : Zero.toString();
    // If the respective child node is an output, it should be considered for user deltas
    const deltaTokensOut = sortedTokens.filter((t) =>
      node.children
        .filter((c) => c.exitAction === 'output')
        .map((c) => c.address)
        .includes(t)
    );
    const deltaAmountsOut = userAmountTokensOut.filter((_, i) =>
      deltaTokensOut.includes(sortedTokens[i])
    );

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
    return (
      node.exitAction !== 'output' &&
      node.exitAction !== 'unwrap' &&
      node.exitAction !== 'exitPool'
    );
  };
}
