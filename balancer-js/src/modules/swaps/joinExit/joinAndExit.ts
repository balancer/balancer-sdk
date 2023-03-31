import { Interface } from '@ethersproject/abi';
import { BigNumber } from '@ethersproject/bignumber';
import { AddressZero } from '@ethersproject/constants';
import {
  SubgraphPoolBase,
  SwapInfo,
  SwapTypes,
  SwapV2,
} from '@balancer-labs/sor';
import {
  Relayer,
  EncodeJoinPoolInput,
  EncodeBatchSwapInput,
  ExitPoolData,
} from '@/modules/relayer/relayer.module';
import { getPoolAddress } from '@/pool-utils';
import { subSlippage } from '@/lib/utils/slippageHelper';
import { BalancerError, BalancerErrorCode } from '@/balancerErrors';
import {
  buildExitCall,
  buildJoinCall,
  buildBatchSwapCall,
  createExitAction,
  createJoinAction,
  createSwapAction,
  orderActions,
  ActionType,
  Actions,
} from './actions';

import balancerRelayerAbi from '@/lib/abi/BalancerRelayer.json';

const balancerRelayerInterface = new Interface(balancerRelayerAbi);

export function canUseJoinExit(
  swapType: SwapTypes,
  tokenIn: string,
  tokenOut: string
): boolean {
  if (
    swapType === SwapTypes.SwapExactOut ||
    tokenIn.toLowerCase() === AddressZero.toLowerCase() ||
    tokenOut.toLowerCase() === AddressZero.toLowerCase()
  )
    return false;
  else return true;
}

/**
 * Currently SOR only supports join/exit paths through Weighted pools.
 * Weighted pools should not have preminted BPT so can assume if a swap token is pool address it is a join or exit.
 * @param pools
 * @param swap
 * @param assets
 * @returns
 */
export function hasJoinExit(
  pools: SubgraphPoolBase[],
  swap: SwapV2,
  assets: string[]
): boolean {
  const pool = pools.find((p) => p.id === swap.poolId);
  if (pool?.poolType !== 'Weighted') return false;
  const tokenIn = assets[swap.assetInIndex];
  const tokenOut = assets[swap.assetOutIndex];
  return [tokenIn, tokenOut].includes(pool.address);
}

/**
 * Finds if a swap returned by SOR is a join by checking if tokenOut === poolAddress
 * @param swap
 * @param assets
 * @returns
 */
export function isJoin(swap: SwapV2, assets: string[]): boolean {
  // token[join]bpt
  const tokenOut = assets[swap.assetOutIndex];
  const poolAddress = getPoolAddress(swap.poolId);
  return tokenOut.toLowerCase() === poolAddress.toLowerCase();
}

/**
 * Finds if a swap returned by SOR is an exit by checking if tokenIn === poolAddress
 * @param swap
 * @param assets
 * @returns
 */
export function isExit(swap: SwapV2, assets: string[]): boolean {
  // bpt[exit]token
  const tokenIn = assets[swap.assetInIndex];
  const poolAddress = getPoolAddress(swap.poolId);
  return tokenIn.toLowerCase() === poolAddress.toLowerCase();
}

/**
 * Find if any of the swaps are join/exits. If yes these swaps should be routed via Relayer.
 * @param pools
 * @param swaps
 * @param assets
 * @returns
 */
export function someJoinExit(
  pools: SubgraphPoolBase[],
  swaps: SwapV2[],
  assets: string[]
): boolean {
  return swaps.some((swap) => {
    return hasJoinExit(pools, swap, assets);
  });
}

/**
 * Translate each swap into an Action. An Action is a join/exit/swap with the chained output refs.
 * @param swapType
 * @param tokenIn
 * @param tokenOut
 * @param swaps
 * @param assets
 * @param slippage
 * @param pools
 * @param user
 * @param relayer
 * @returns
 */
export function getActions(
  tokenIn: string,
  tokenOut: string,
  swaps: SwapV2[],
  assets: string[],
  slippage: string,
  pools: SubgraphPoolBase[],
  user: string,
  relayer: string
): Actions[] {
  const tokenInIndex = assets.findIndex(
    (t) => t.toLowerCase() === tokenIn.toLowerCase()
  );
  const tokenOutIndex = assets.findIndex(
    (t) => t.toLowerCase() === tokenOut.toLowerCase()
  );
  const actions: Actions[] = [];
  let opRefKey = 0;
  let previousAction: Actions = {} as Actions;
  for (const swap of swaps) {
    if (isJoin(swap, assets)) {
      const [joinAction, newOpRefKey] = createJoinAction(
        swap,
        tokenInIndex,
        tokenOutIndex,
        opRefKey,
        assets,
        slippage,
        user,
        relayer
      );
      opRefKey = newOpRefKey;
      actions.push(joinAction);
      previousAction = joinAction;
      continue;
    } else if (isExit(swap, assets)) {
      const [exitAction, newOpRefKey] = createExitAction(
        swap,
        tokenInIndex,
        tokenOutIndex,
        opRefKey,
        assets,
        slippage,
        user,
        relayer
      );
      opRefKey = newOpRefKey;
      actions.push(exitAction);
      previousAction = exitAction;
      continue;
    } else {
      const amount = swap.amount;
      const [swapAction, newOpRefKey] = createSwapAction(
        swap,
        tokenInIndex,
        tokenOutIndex,
        opRefKey,
        assets,
        slippage,
        pools,
        user,
        relayer
      );
      if (previousAction.type === ActionType.Swap && amount === '0') {
        /*
        If its part of a multihop swap the amount will be 0 (and should remain 0)
        The source will be same as previous swap so set previous receiver to match sender. Receiver set as is.
        */
        previousAction.receiver = previousAction.sender;
        previousAction.toInternal = previousAction.fromInternal;
        previousAction.opRef = [];
        swapAction.sender = previousAction.receiver;
        swapAction.fromInternal = previousAction.fromInternal;
        swapAction.amountIn = '0';
        swapAction.swap.amount = '0';
      }
      opRefKey = newOpRefKey;
      actions.push(swapAction);
      previousAction = swapAction;
      continue;
    }
  }
  return actions;
}

/**
 * Given swapInfo from the SOR construct the Relayer multicall to execture swaps/joins/exits.
 * @param swapInfo Returned from SOR
 * @param swapType Only supports ExactIn
 * @param pools Pool info from SOR
 * @param user Address of user
 * @param relayerAddress Address of Relayer (>=V4)
 * @param wrappedNativeAsset Address of Native asset
 * @param slippage [bps], eg: 1 === 0.01%, 100 === 1%
 * @param authorisation Encoded authorisation call.
 * @returns
 */
export function buildRelayerCalls(
  swapInfo: SwapInfo,
  pools: SubgraphPoolBase[],
  user: string,
  relayerAddress: string,
  wrappedNativeAsset: string,
  slippage: string,
  authorisation: string | undefined
): {
  to: string;
  data: string;
  rawCalls: string[];
  inputs: (EncodeBatchSwapInput | ExitPoolData | EncodeJoinPoolInput)[];
} {
  // For each 'swap' create a swap/join/exit action
  const actions = getActions(
    swapInfo.tokenIn,
    swapInfo.tokenOut,
    swapInfo.swaps,
    swapInfo.tokenAddresses,
    slippage,
    pools,
    user,
    relayerAddress
  );
  // Arrange action into order that will create minimal amount of calls
  const orderedActions = orderActions(actions, swapInfo.tokenAddresses);

  const calls: string[] = [];
  const inputs: (EncodeBatchSwapInput | ExitPoolData | EncodeJoinPoolInput)[] =
    [];
  // These amounts are used to compare to expected amounts
  const amountsIn: BigNumber[] = [];
  const amountsOut: BigNumber[] = [];
  if (authorisation)
    // Uses relayer to approve itself to act in behalf of the user
    calls.push(
      Relayer.encodeSetRelayerApproval(relayerAddress, true, authorisation)
    );

  // Create encoded call for each action
  for (const action of orderedActions) {
    if (action.type === ActionType.Exit) {
      const pool = pools.find((p) => p.id === action.poolId);
      if (pool === undefined)
        throw new BalancerError(BalancerErrorCode.NO_POOL_DATA);
      const [call, amountIn, amountOut, exitPoolData] = buildExitCall(
        pool,
        action,
        wrappedNativeAsset
      );
      calls.push(call);
      inputs.push(exitPoolData);
      amountsIn.push(BigNumber.from(amountIn));
      amountsOut.push(BigNumber.from(amountOut));
    }
    if (action.type === ActionType.Join) {
      const pool = pools.find((p) => p.id === action.poolId);
      if (pool === undefined)
        throw new BalancerError(BalancerErrorCode.NO_POOL_DATA);
      const [call, amountIn, amountOut, encodeJoinPoolInput] = buildJoinCall(
        pool,
        action,
        wrappedNativeAsset
      );
      calls.push(call);
      inputs.push(encodeJoinPoolInput);
      amountsIn.push(BigNumber.from(amountIn));
      amountsOut.push(BigNumber.from(amountOut));
    }
    if (action.type === ActionType.BatchSwap) {
      const [batchSwapCalls, amountIn, amountOut, batchSwapInput] =
        buildBatchSwapCall(action, swapInfo.tokenIn, swapInfo.tokenOut);
      calls.push(...batchSwapCalls);
      inputs.push(batchSwapInput);
      amountsIn.push(BigNumber.from(amountIn));
      amountsOut.push(BigNumber.from(amountOut));
    }
  }

  // Safety check to make sure amounts/limits from calls match expected
  checkAmounts(amountsIn, amountsOut, swapInfo, slippage);
  // encode relayer multicall
  const callData = balancerRelayerInterface.encodeFunctionData('multicall', [
    calls,
  ]);

  return {
    to: relayerAddress,
    data: callData,
    rawCalls: calls,
    inputs,
  };
}

function checkAmounts(
  amountsIn: BigNumber[],
  amountsOut: BigNumber[],
  swapInfo: SwapInfo,
  slippage: string
): void {
  const totalIn = amountsIn.reduce(
    (total = BigNumber.from(0), amount) => (total = total.add(amount))
  );
  const totalOut = amountsOut.reduce(
    (total = BigNumber.from(0), amount) => (total = total.add(amount))
  );
  // totalIn should equal the original input swap amount
  // totalOut should equal the return amount from SOR minus any slippage allowance
  // console.log(totalIn.toString(), 'totalIn');
  // console.log(swapInfo.swapAmount.toString(), 'swapInfo.swapAmount');
  // console.log(totalOut.toString(), 'totalOut');
  // console.log(
  //   subSlippage(swapInfo.returnAmount, BigNumber.from(slippage)).toString(),
  //   'slippage'
  // );
  // console.log(swapInfo.returnAmount.toString(), 'swapInfo.returnAmount');
  const diffOut = totalOut.sub(
    subSlippage(swapInfo.returnAmount, BigNumber.from(slippage))
  );
  if (!totalIn.eq(swapInfo.swapAmount) || !diffOut.lt(`3`))
    throw new BalancerError(BalancerErrorCode.RELAY_SWAP_AMOUNTS);
  /* ExactOut case
    // totalIn should equal the return amount from SOR (this is the amount in) plus any slippage allowance
    // totalOut should equal the original input swap amount (the exact amount out)
    if (
      !totalIn.eq(
        addSlippage(swapInfo.returnAmount, BigNumber.from(slippage))
      ) ||
      !totalOut.eq(swapInfo.swapAmount)
    )
      throw new BalancerError(BalancerErrorCode.RELAY_SWAP_AMOUNTS);
    */
}
