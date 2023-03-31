import { BigNumber } from '@ethersproject/bignumber';
import { MaxUint256 } from '@ethersproject/constants';
import { SubgraphPoolBase, SwapV2 } from '@balancer-labs/sor';
import {
  Relayer,
  EncodeBatchSwapInput,
} from '@/modules/relayer/relayer.module';
import { FundManagement, SwapType } from '../../types';
import { ActionStep, ActionType, SwapAction, BatchSwapAction } from './types';
import {
  getActionStep,
  getActionAmount,
  getActionMinOut,
  getActionOutputRef,
} from './helpers';

function isBpt(pools: SubgraphPoolBase[], token: string): boolean {
  return pools.some((p) => p.address.toLowerCase() === token.toLowerCase());
}

/**
 * Create a SwapAction with relevant info.
 * @param swapType
 * @param swap
 * @param mainTokenInIndex
 * @param mainTokenOutIndex
 * @param opRefKey
 * @param assets
 * @param slippage
 * @param pools
 * @param user
 * @param relayer
 * @returns
 */
export function createSwapAction(
  swap: SwapV2,
  mainTokenInIndex: number,
  mainTokenOutIndex: number,
  opRefKey: number,
  assets: string[],
  slippage: string,
  pools: SubgraphPoolBase[],
  user: string,
  relayer: string
): [SwapAction, number] {
  const actionStep = getActionStep(
    mainTokenInIndex,
    mainTokenOutIndex,
    swap.assetInIndex,
    swap.assetOutIndex
  );
  // Will get actual amount if input or chain amount if part of chain
  const amountIn = getActionAmount(
    swap.amount,
    ActionType.Swap,
    actionStep,
    opRefKey
  );
  // Updates swap data to use chainedRef if required
  swap.amount = amountIn;
  // This will be 0 if not a mainTokenOut action otherwise amount using slippage
  const minOut = getActionMinOut(swap.returnAmount ?? '0', slippage);
  // This will set opRef for next chained action if required
  const [opRef, newOpRefKey] = getActionOutputRef(
    actionStep,
    swap.assetOutIndex,
    opRefKey
  );
  const hasTokenIn =
    actionStep === ActionStep.Direct || actionStep === ActionStep.TokenIn
      ? true
      : false;
  const hasTokenOut =
    actionStep === ActionStep.Direct || actionStep === ActionStep.TokenOut
      ? true
      : false;
  const isBptIn = isBpt(pools, assets[swap.assetInIndex]);
  // joins - can't join a pool and send BPT to internal balances
  // Because of ^ we can assume that any BPT is coming from external (either from user or join)
  let fromInternal = true;
  if (hasTokenIn || isBptIn) fromInternal = false;
  // exits - can't exit using BPT from internal balances
  // Because of ^ we can assume that any tokenOut BPT is going to external (either to user or exit)
  let toInternal = true;
  if (hasTokenOut || isBpt(pools, assets[swap.assetOutIndex]))
    toInternal = false;

  // tokenIn/Out will come from/go to the user. Any other tokens are intermediate and will be from/to Relayer
  let sender: string;
  if (hasTokenIn) {
    sender = user;
  } else {
    sender = relayer;
  }
  let receiver: string;
  if (hasTokenOut) {
    receiver = user;
  } else {
    receiver = relayer;
  }

  const swapAction: SwapAction = {
    type: ActionType.Swap,
    opRef: opRef.key ? [opRef] : [],
    minOut,
    amountIn,
    assets,
    swap: swap,
    hasTokenIn,
    hasTokenOut,
    fromInternal,
    toInternal,
    isBptIn,
    sender,
    receiver,
  };
  return [swapAction, newOpRefKey];
}

/**
 * Creates encoded batchSwap call.
 * @param action
 * @param swapType
 * @param tokenIn
 * @param tokenOut
 * @returns
 */
export function buildBatchSwapCall(
  action: BatchSwapAction,
  tokenIn: string,
  tokenOut: string
): [string[], string, string, EncodeBatchSwapInput] {
  const calls: string[] = [];

  for (const token of action.approveTokens) {
    // If swap tokenIn is a BPT then:
    // new pools have automatic infinite vault allowance, but not old ones
    // const key = Relayer.fromChainedReference(action.swaps[0].amount);
    // const readOnlyRef = Relayer.toChainedReference(key, false);
    // const approval = Relayer.encodeApproveVault(token, readOnlyRef.toString());
    // TODO fix approval amount
    const approval = Relayer.encodeApproveVault(token, MaxUint256.toString());
    calls.push(approval);
  }

  const funds: FundManagement = {
    sender: action.sender,
    recipient: action.receiver,
    fromInternalBalance: action.fromInternal,
    toInternalBalance: action.toInternal,
  };
  const batchSwapInput: EncodeBatchSwapInput = {
    swapType: SwapType.SwapExactIn,
    swaps: action.swaps,
    assets: action.assets,
    funds,
    limits: action.limits.map((l) => l.toString()),
    deadline: BigNumber.from(Math.ceil(Date.now() / 1000) + 3600), // 1 hour from now
    value: '0',
    outputReferences: action.opRef,
  };
  // console.log(batchSwapInput);

  const encodedBatchSwap = Relayer.encodeBatchSwap(batchSwapInput);
  calls.push(encodedBatchSwap);
  const maintokenInIndex = action.assets.findIndex(
    (t) => t.toLowerCase() === tokenIn.toLowerCase()
  );
  const maintokenOutIndex = action.assets.findIndex(
    (t) => t.toLowerCase() === tokenOut.toLowerCase()
  );
  const amountIn = action.hasTokenIn
    ? action.limits[maintokenInIndex].toString()
    : '0';
  const amountOut = action.hasTokenOut
    ? action.limits[maintokenOutIndex].abs().toString()
    : '0';
  return [calls, amountIn, amountOut, batchSwapInput];
}
