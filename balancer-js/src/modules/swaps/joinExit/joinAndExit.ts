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
import { orderActions, ActionType, Actions } from './actions';

import balancerRelayerAbi from '@/lib/abi/BalancerRelayer.json';
import { Join } from './actions/join';
import { Exit } from './actions/exit';
import { Swap } from './actions/swap';
import { Logger } from '@/lib/utils/logger';

const balancerRelayerInterface = new Interface(balancerRelayerAbi);

// Quickly switch useful debug logs on/off
const DEBUG = false;

function debugLog(log: string) {
  const logger = Logger.getInstance();
  if (DEBUG) logger.info(log);
}

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
export function isJoin(
  swap: SwapV2,
  assets: string[],
  poolType: string | undefined
): boolean {
  if (poolType !== 'Weighted') return false;
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
export function isExit(
  swap: SwapV2,
  assets: string[],
  poolType: string | undefined
): boolean {
  if (poolType !== 'Weighted') return false;
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
  for (const swap of swaps) {
    const poolType = pools.find((p) => p.id === swap.poolId)?.poolType;
    if (isJoin(swap, assets, poolType)) {
      const newJoin = new Join(
        swap,
        tokenInIndex,
        tokenOutIndex,
        opRefKey,
        assets,
        slippage,
        user,
        relayer
      );
      opRefKey = newJoin.nextOpRefKey;
      actions.push(newJoin);
      continue;
    } else if (isExit(swap, assets, poolType)) {
      const newExit = new Exit(
        swap,
        tokenInIndex,
        tokenOutIndex,
        opRefKey,
        assets,
        slippage,
        user,
        relayer
      );
      opRefKey = newExit.nextOpRefKey;
      actions.push(newExit);
      continue;
    } else {
      const newSwap = new Swap(
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
      opRefKey = newSwap.nextOpRefKey;
      actions.push(newSwap);
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
  const orderedActions = orderActions(actions);

  const calls: string[] = [];
  const inputs: (EncodeBatchSwapInput | ExitPoolData | EncodeJoinPoolInput)[] =
    [];
  if (authorisation)
    // Uses relayer to approve itself to act in behalf of the user
    calls.push(
      Relayer.encodeSetRelayerApproval(relayerAddress, true, authorisation)
    );

  // Create encoded call for each action
  for (const action of orderedActions) {
    if (action.type === ActionType.Exit || action.type === ActionType.Join) {
      const pool = pools.find((p) => p.id === action.poolId);
      if (pool === undefined)
        throw new BalancerError(BalancerErrorCode.NO_POOL_DATA);
      const { params, encoded } = action.callData(pool, wrappedNativeAsset);
      calls.push(encoded as string);
      inputs.push(params);
    }
    if (action.type === ActionType.BatchSwap) {
      const { params, encoded } = action.callData();
      calls.push(...encoded);
      inputs.push(params);
    }
  }

  // Safety check to make sure amounts/limits from calls match expected
  checkAmounts(
    orderedActions.map((a) => BigNumber.from(a.getAmountIn())),
    orderedActions.map((a) => BigNumber.from(a.getAmountOut())),
    swapInfo,
    slippage
  );
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
  debugLog(`${totalIn.toString()} totalIn`);
  debugLog(`${swapInfo.swapAmount.toString()} swapInfo.swapAmount`);
  debugLog(`${totalOut.toString()} totalOut`);
  debugLog(
    `${subSlippage(
      swapInfo.returnAmount,
      BigNumber.from(slippage)
    ).toString()} slippage`
  );
  debugLog(`${swapInfo.returnAmount.toString()} swapInfo.returnAmount`);
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
