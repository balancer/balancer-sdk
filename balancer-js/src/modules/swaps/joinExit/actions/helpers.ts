import { cloneDeep } from 'lodash';
import { BigNumber } from '@ethersproject/bignumber';
import { MaxInt256 } from '@ethersproject/constants';
import { Relayer, OutputReference } from '@/modules/relayer/relayer.module';
import { subSlippage } from '@/lib/utils/slippageHelper';
import {
  ActionStep,
  ActionType,
  Actions,
  EMPTY_BATCHSWAP_ACTION,
  BatchSwapAction,
} from './types';

/**
 * If its not the first action then the amount will come from the previous output ref
 * @param amount
 * @param actionType
 * @param actionStep
 * @param opRefKey
 * @returns
 */
export function getActionAmount(
  amount: string,
  actionType: ActionType,
  actionStep: ActionStep,
  opRefKey: number
): string {
  let amountIn = amount;
  if (
    actionStep === ActionStep.TokenOut ||
    (actionStep === ActionStep.Middle && actionType === ActionType.Join) ||
    (actionStep === ActionStep.Middle && actionType === ActionType.Exit)
  ) {
    amountIn = Relayer.toChainedReference(opRefKey - 1).toString();
  }
  return amountIn;
}

function getOutputRef(key: number, index: number): OutputReference {
  const keyRef = Relayer.toChainedReference(key);
  return { index: index, key: keyRef };
}

/**
 * If its not the final action then we need an outputReferece to chain to next action as input
 * @param actionStep
 * @param tokenOutIndex
 * @param opRefKey
 * @returns
 */
export function getActionOutputRef(
  actionStep: ActionStep,
  tokenOutIndex: number,
  opRefKey: number
): [OutputReference, number] {
  let opRef: OutputReference = {} as OutputReference;
  if (actionStep === ActionStep.TokenIn || actionStep === ActionStep.Middle) {
    opRef = getOutputRef(opRefKey, tokenOutIndex);
    opRefKey++;
  }
  return [opRef, opRefKey];
}

/**
 * Use slippage to set min amount out
 * @param amountOut
 * @param slippage
 * @returns
 */
export function getActionMinOut(amountOut: string, slippage: string): string {
  // Currently only handle ExactIn swap. ExactOut would add slippage
  // We should apply slippage to each swaps amountOut
  return subSlippage(
    BigNumber.from(amountOut),
    BigNumber.from(slippage)
  ).toString();
}

/**
 * Find if the Action is:
 * Direct: tokenIn > tokenOut
 * TokenIn: tokenIn > chain...
 * TokenOut: ...chain > tokenOut
 * Middle: ...chain > action > chain...
 * @param tokenInIndex
 * @param tokenOutIndex
 * @param tokenInIndexAction
 * @param tokenOutIndexAction
 * @returns
 */
export function getActionStep(
  tokenInIndex: number,
  tokenOutIndex: number,
  tokenInIndexAction: number,
  tokenOutIndexAction: number
): ActionStep {
  let actionStep: ActionStep;
  if (
    tokenInIndexAction === tokenInIndex &&
    tokenOutIndexAction === tokenOutIndex
  ) {
    actionStep = ActionStep.Direct;
  } else if (tokenInIndexAction === tokenInIndex) {
    actionStep = ActionStep.TokenIn;
  } else if (tokenOutIndexAction === tokenOutIndex) {
    actionStep = ActionStep.TokenOut;
  } else {
    actionStep = ActionStep.Middle;
  }
  return actionStep;
}

/**
 * Find the number of actions that end with tokenOut
 * @param actions
 * @returns
 */
export function getNumberOfOutputActions(actions: Actions[]): number {
  let outputCount = 0;
  for (const a of actions) {
    if (a.hasTokenOut) outputCount++;
  }
  return outputCount;
}

/**
 * Categorize each action into a Join, Middle or Exit.
 * @param actions
 * @returns
 */
export function categorizeActions(actions: Actions[]): Actions[] {
  const enterActions: Actions[] = [];
  const exitActions: Actions[] = [];
  const middleActions: Actions[] = [];
  for (const a of actions) {
    if (a.type === ActionType.Exit || a.type === ActionType.Join) {
      // joins/exits with tokenIn can always be done first
      if (a.hasTokenIn) enterActions.push(a);
      // joins/exits with tokenOut (and not tokenIn) can always be done last
      else if (a.hasTokenOut) exitActions.push(a);
      else middleActions.push(a);
    }
    // All other actions will be chained inbetween
    else middleActions.push(a);
  }
  const allActions: Actions[] = [
    ...enterActions,
    ...middleActions,
    ...exitActions,
  ];
  return allActions;
}

/**
 * This aims to minimise the number of Actions the Relayer multicall needs to call by batching sequential swaps together.
 * @param actions
 * @param assets
 * @returns
 */
export function batchSwapActions(
  allActions: Actions[],
  assets: string[]
): Actions[] {
  /*
  batchSwaps are a collection of swaps that can all be called in a single batchSwap
  Can batch all swaps with same source
  Any swap without tokenIn && not BPT should be coming from internal balances
  Any swap with tokenIn or BPT should be coming from external balances
  */
  const orderedActions: Actions[] = [];
  let batchSwaps = cloneDeep(EMPTY_BATCHSWAP_ACTION);
  let isFirstSwap = true;
  let previousSwap: BatchSwapAction = {} as BatchSwapAction;

  for (const a of allActions) {
    if (a.type === ActionType.BatchSwap) {
      if (isFirstSwap) {
        previousSwap = a;
        batchSwaps.assets = a.assets;
        batchSwaps.limits = Array(a.assets.length).fill(BigNumber.from('0'));
        isFirstSwap = false;
      }
      if (a.isBptIn) {
        // Older pools don't have pre-approval so need to add this as a step
        batchSwaps.approveTokens.push(a.assets[a.swaps[0].assetInIndex]);
      }
      // If swap has different send/receive params than previous then it will need to be done separately
      if (
        a.fromInternal !== previousSwap.fromInternal ||
        a.toInternal !== previousSwap.toInternal ||
        a.receiver !== previousSwap.receiver ||
        a.sender !== previousSwap.sender
      ) {
        if (batchSwaps.swaps.length > 0) {
          orderedActions.push(batchSwaps);
          batchSwaps = cloneDeep(EMPTY_BATCHSWAP_ACTION);
          batchSwaps.assets = a.assets;
          batchSwaps.limits = Array(a.assets.length).fill(BigNumber.from('0'));
        }
      }
      batchSwaps.swaps.push(a.swaps[0]);
      batchSwaps.opRef.push(...a.opRef);
      batchSwaps.fromInternal = a.fromInternal;
      batchSwaps.toInternal = a.toInternal;
      batchSwaps.sender = a.sender;
      batchSwaps.receiver = a.receiver;
      if (a.hasTokenIn) {
        batchSwaps.hasTokenIn = true;
        // We need to add amount for each swap that uses tokenIn to get correct total
        batchSwaps.limits[a.swaps[0].assetInIndex] = batchSwaps.limits[
          a.swaps[0].assetInIndex
        ].add(a.amountIn);
      } else {
        // This will be a chained swap/input amount
        batchSwaps.limits[a.swaps[0].assetInIndex] = MaxInt256;
      }
      if (a.hasTokenOut) {
        // We need to add amount for each swap that uses tokenOut to get correct total (should be negative)
        batchSwaps.hasTokenOut = true;
        batchSwaps.limits[a.swaps[0].assetOutIndex] = batchSwaps.limits[
          a.swaps[0].assetOutIndex
        ].sub(a.minOut);
      }
      previousSwap = a;
    } else {
      // Non swap action
      if (batchSwaps.swaps.length > 0) {
        orderedActions.push(batchSwaps);
        // new batchSwap collection as there is a chained join/exit inbetween
        batchSwaps = cloneDeep(EMPTY_BATCHSWAP_ACTION);
        isFirstSwap = true;
      }
      orderedActions.push(a);
    }
  }
  if (batchSwaps.swaps.length > 0) orderedActions.push(batchSwaps);
  return orderedActions;
}

/**
 * Organise Actions into order with least amount of calls.
 * @param actions
 * @param assets
 * @returns
 */
export function orderActions(actions: Actions[], assets: string[]): Actions[] {
  const categorizedActions = categorizeActions(actions);
  const orderedActions = batchSwapActions(categorizedActions, assets);
  return orderedActions;
}
