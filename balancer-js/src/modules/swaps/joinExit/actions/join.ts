import { SubgraphPoolBase, SwapV2 } from '@balancer-labs/sor';
import { Relayer, EncodeJoinPoolInput } from '@/modules/relayer/relayer.module';
import { WeightedPoolEncoder } from '@/pool-weighted';
import { AssetHelpers } from '@/lib/utils';
import { ActionStep, ActionType, JoinAction } from './types';
import {
  getActionStep,
  getActionAmount,
  getActionMinOut,
  getActionOutputRef,
} from './helpers';

/**
 * Create a JoinAction with relevant info
 * @param swapType
 * @param swap
 * @param mainTokenInIndex
 * @param mainTokenOutIndex
 * @param opRefKey
 * @param assets
 * @param slippage
 * @returns
 */
export function createJoinAction(
  swap: SwapV2,
  mainTokenInIndex: number,
  mainTokenOutIndex: number,
  opRefKey: number,
  assets: string[],
  slippage: string,
  user: string,
  relayerAddress: string
): [JoinAction, number] {
  const actionStep = getActionStep(
    mainTokenInIndex,
    mainTokenOutIndex,
    swap.assetInIndex,
    swap.assetOutIndex
  );
  // Will get actual amount if input or chain amount if part of chain
  const amountIn = getActionAmount(
    swap.amount,
    ActionType.Join,
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
  let fromInternal = true;
  let hasTokenIn = false;
  // If using mainTokenIn we can assume it comes from user
  if (actionStep === ActionStep.Direct || actionStep === ActionStep.TokenIn) {
    sender = user;
    fromInternal = false;
    hasTokenIn = true;
  }
  let receiver = relayerAddress;
  let hasTokenOut = false;
  // If using mainTokenOut we can assume it goes to user
  if (actionStep === ActionStep.Direct || actionStep === ActionStep.TokenOut) {
    receiver = user;
    hasTokenOut = true;
  }

  const joinAction: JoinAction = {
    type: ActionType.Join,
    poolId: swap.poolId,
    tokenIn: assets[swap.assetInIndex],
    bpt: assets[swap.assetOutIndex],
    opRef,
    minOut,
    amountIn,
    assets,
    actionStep,
    sender,
    receiver,
    fromInternal,
    hasTokenIn,
    hasTokenOut,
  };
  return [joinAction, newOpRefKey];
}

/**
 * Creates encoded joinPool call.
 * @param pool
 * @param action
 * @param wrappedNativeAsset
 * @returns
 */
export function buildJoinCall(
  pool: SubgraphPoolBase,
  action: JoinAction,
  wrappedNativeAsset: string
): [string, string, string, EncodeJoinPoolInput] {
  const assets = pool.tokensList;
  const assetHelpers = new AssetHelpers(wrappedNativeAsset);
  // tokens must have same order as pool getTokens
  const [sortedTokens] = assetHelpers.sortTokens(assets) as [string[]];
  const joinToken = action.tokenIn;
  const joinTokenIndex = sortedTokens.findIndex(
    (t) => t.toLowerCase() === joinToken.toLowerCase()
  );
  const maxAmountsIn = Array(assets.length).fill('0');
  // Uses exact amounts of tokens in
  maxAmountsIn[joinTokenIndex] = action.amountIn;
  // Variable amount of BPT out (this has slippage applied)
  const bptAmountOut = action.minOut;
  const userData = WeightedPoolEncoder.joinExactTokensInForBPTOut(
    maxAmountsIn,
    bptAmountOut
  );
  const attributes: EncodeJoinPoolInput = {
    poolId: action.poolId,
    sender: action.sender,
    recipient: action.receiver,
    kind: 0,
    joinPoolRequest: {
      assets: sortedTokens,
      maxAmountsIn,
      userData,
      fromInternalBalance: action.fromInternal,
    },
    value: '0',
    outputReference: action.opRef.key ? action.opRef.key.toString() : '0',
  };

  // console.log(attributes);

  const callData = Relayer.encodeJoinPool(attributes);
  // These are used for final amount check
  const amountOut = action.hasTokenOut ? bptAmountOut : '0';
  const amountIn = action.hasTokenIn ? maxAmountsIn[joinTokenIndex] : '0';

  return [callData, amountIn, amountOut, attributes];
}
