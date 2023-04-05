import { ActionType, Actions } from './types';
import { Swap } from './swap';

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
export function batchSwapActions(allActions: Actions[]): Actions[] {
  /*
  batchSwaps are a collection of swaps that can all be called in a single batchSwap
  Can batch all swaps with same source
  Any swap without tokenIn && not BPT should be coming from internal balances
  Any swap with tokenIn or BPT should be coming from external balances
  */
  const orderedActions: Actions[] = [];
  let batchedSwaps: Swap | undefined = undefined;

  for (const a of allActions) {
    if (a.type === ActionType.BatchSwap) {
      if (!batchedSwaps) {
        batchedSwaps = a.copy();
      } else {
        if (batchedSwaps.canAddSwap(a)) {
          batchedSwaps.addSwap(a);
        } else {
          orderedActions.push(batchedSwaps);
          batchedSwaps = a.copy();
        }
      }
    } else {
      // Non swap action
      if (batchedSwaps) {
        orderedActions.push(batchedSwaps);
        // new batchSwap collection as there is a chained join/exit inbetween
        batchedSwaps = undefined;
      }
      orderedActions.push(a);
    }
  }
  if (batchedSwaps) orderedActions.push(batchedSwaps);

  return orderedActions;
}

/**
 * Organise Actions into order with least amount of calls.
 * @param actions
 * @param assets
 * @returns
 */
export function orderActions(actions: Actions[]): Actions[] {
  const categorizedActions = categorizeActions(actions);
  const orderedActions = batchSwapActions(categorizedActions);
  return orderedActions;
}
