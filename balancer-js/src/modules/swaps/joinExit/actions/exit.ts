import { SubgraphPoolBase, SwapV2 } from '@balancer-labs/sor';
import { Relayer, ExitPoolData } from '@/modules/relayer/relayer.module';
import { ExitPoolRequest } from '@/types';
import { WeightedPoolEncoder } from '@/pool-weighted';
import { AssetHelpers } from '@/lib/utils';
import { ActionStep, ActionType, ExitAction } from './types';
import {
  getActionStep,
  getActionAmount,
  getActionMinOut,
  getActionOutputRef,
} from './helpers';

/**
 * Create a ExitAction with relevant info.
 * @param swapType
 * @param swap
 * @param tokenInIndex
 * @param tokenOutIndex
 * @param opRefKey
 * @param assets
 * @param slippage
 * @param user
 * @param relayerAddress
 * @returns
 */
export function createExitAction(
  swap: SwapV2,
  tokenInIndex: number,
  tokenOutIndex: number,
  opRefKey: number,
  assets: string[],
  slippage: string,
  user: string,
  relayerAddress: string
): [ExitAction, number] {
  const actionStep = getActionStep(
    tokenInIndex,
    tokenOutIndex,
    swap.assetInIndex,
    swap.assetOutIndex
  );
  // Will get actual amount if input or chain amount if part of chain
  const amountIn = getActionAmount(
    swap.amount,
    ActionType.Exit,
    actionStep,
    opRefKey
  );
  // This will be 0 if not a mainTokenOut action otherwise amount using slippage
  const minOut = getActionMinOut(swap.returnAmount ?? '0', slippage);
  // This will set opRef for next chained action if required
  const [opRef, newOpRefKey] = getActionOutputRef(
    actionStep,
    swap.assetOutIndex,
    opRefKey
  );
  let sender = relayerAddress;
  let hasTokenIn = false;
  if (actionStep === ActionStep.Direct || actionStep === ActionStep.TokenIn) {
    sender = user;
    hasTokenIn = true;
  }
  // Send to relayer unless this is main token out
  let hasTokenOut = false;
  let toInternalBalance = true;
  let receiver = relayerAddress;
  if (actionStep === ActionStep.Direct || actionStep === ActionStep.TokenOut) {
    receiver = user;
    toInternalBalance = false;
    hasTokenOut = true;
  }

  const exitAction: ExitAction = {
    type: ActionType.Exit,
    poolId: swap.poolId,
    tokenOut: assets[swap.assetOutIndex],
    bpt: assets[swap.assetInIndex],
    opRef: opRef.key ? [opRef] : [],
    minOut,
    amountIn,
    assets,
    actionStep,
    sender,
    receiver,
    toInternal: toInternalBalance,
    hasTokenIn,
    hasTokenOut,
  };
  return [exitAction, newOpRefKey];
}

/**
 * Creates encoded exitPool call.
 * @param pool
 * @param action
 * @param wrappedNativeAsset
 * @returns
 */
export function buildExitCall(
  pool: SubgraphPoolBase,
  action: ExitAction,
  wrappedNativeAsset: string
): [string, string, string, ExitPoolData] {
  const assets = pool.tokensList;
  const assetHelpers = new AssetHelpers(wrappedNativeAsset);
  // tokens must have same order as pool getTokens
  const [sortedTokens] = assetHelpers.sortTokens(assets) as [string[]];
  const exitToken = action.tokenOut;
  const exitTokenIndex = sortedTokens.findIndex(
    (t) => t.toLowerCase() === exitToken.toLowerCase()
  );
  const minAmountsOut = Array(assets.length).fill('0');
  // Variable amount of token out (this has slippage applied)
  minAmountsOut[exitTokenIndex] = action.minOut;
  // Uses exact amount in
  const bptAmtIn = action.amountIn;
  const userData = WeightedPoolEncoder.exitExactBPTInForOneTokenOut(
    bptAmtIn,
    exitTokenIndex
  );
  const exitParams: ExitPoolData = {
    assets: sortedTokens,
    minAmountsOut,
    userData,
    toInternalBalance: action.toInternal,
    poolId: action.poolId,
    poolKind: 0, // This will always be 0 to match supported Relayer types
    sender: action.sender,
    recipient: action.receiver,
    outputReferences: action.opRef,
    exitPoolRequest: {} as ExitPoolRequest,
  };
  // console.log(exitParams);
  const exitPoolInput = Relayer.formatExitPoolInput(exitParams);
  const callData = Relayer.encodeExitPool(exitPoolInput);
  // These are used for final amount check
  const amountOut = action.hasTokenOut ? minAmountsOut[exitTokenIndex] : '0';
  const amountIn = action.hasTokenIn ? bptAmtIn : '0';
  return [callData, amountIn, amountOut, exitParams];
}
