import { SwapV2 } from '@balancer-labs/sor';
import { Relayer, OutputReference } from '@/modules/relayer/relayer.module';
import { getPoolAddress } from '@/pool-utils';

interface Action {
  type: string;
  opRef: OutputReference[];
  swaps: SwapV2[];
  minOut: string;
}

function getOutputRef(key: number, index: number): OutputReference {
  const keyRef = Relayer.toChainedReference(key);
  return { index: index, key: keyRef };
}

export function hasJoinExit(swap: SwapV2, assets: string[]): boolean {
  const tokenIn = assets[swap.assetInIndex];
  const tokenOut = assets[swap.assetOutIndex];
  const poolAddress = getPoolAddress(swap.poolId);
  return [tokenIn, tokenOut].includes(poolAddress);
}

export function isJoin(swap: SwapV2, assets: string[]): boolean {
  // token[join]bpt
  const tokenOut = assets[swap.assetOutIndex];
  const poolAddress = getPoolAddress(swap.poolId);
  return tokenOut.toLowerCase() === poolAddress.toLowerCase();
}

export function isExit(swap: SwapV2, assets: string[]): boolean {
  // bpt[exit]token
  const tokenIn = assets[swap.assetInIndex];
  const poolAddress = getPoolAddress(swap.poolId);
  return tokenIn.toLowerCase() === poolAddress.toLowerCase();
}

export function someJoinExit(swaps: SwapV2[], assets: string[]): boolean {
  return swaps.some((swap) => {
    return hasJoinExit(swap, assets);
  });
}

/*
This aims to minimise the number of Actions the Relayer multicall needs to call by
ordering the Actions in a way that allows swaps to be batched together.
*/
export function orderActions(
  actions: Action[],
  tokenIn: string,
  tokenOut: string,
  assets: string[]
): Action[] {
  const tokenInIndex = assets.indexOf(tokenIn);
  const tokenOutIndex = assets.indexOf(tokenOut);
  const enterActions: Action[] = [];
  const exitActions: Action[] = [];
  const middleActions: Action[] = [];
  for (const a of actions) {
    // joins/exits with tokenIn can always be done first
    if (
      (a.type === 'join' || a.type === 'exit') &&
      a.swaps[0].assetInIndex === tokenInIndex
    )
      enterActions.push(a);
    // joins/exits with tokenOut (and not tokenIn) can always be done last
    else if (
      (a.type === 'join' || a.type === 'exit') &&
      a.swaps[0].assetOutIndex === tokenOutIndex
    )
      exitActions.push(a);
    // All other actions will be chained inbetween
    else middleActions.push(a);
  }
  const allActions: Action[] = [
    ...enterActions,
    ...middleActions,
    ...exitActions,
  ];
  const orderedActions: Action[] = [];
  // batchSwaps are a collection of swaps that can all be called in a single batchSwap
  let batchSwaps: Action = {
    type: 'batchswap',
    swaps: [],
    opRef: [],
    minOut: '0',
  };

  for (const a of allActions) {
    // batch neighbouring swaps together
    if (a.type === 'swap') {
      batchSwaps.swaps.push(...a.swaps);
      batchSwaps.opRef.push(...a.opRef);
      batchSwaps.minOut = a.minOut;
    } else {
      if (batchSwaps.swaps.length > 0) {
        orderedActions.push(batchSwaps);
        // new batchSwap collection as there is a chained join/exit inbetween
        batchSwaps = {
          type: 'batchswap',
          swaps: [],
          opRef: [],
          minOut: '0',
        };
      }
      orderedActions.push(a);
    }
  }
  if (batchSwaps.swaps.length > 0) orderedActions.push(batchSwaps);
  return orderedActions;
}

/*
Create an array of Actions for each swap.
An Action is a join/exit/swap with the chained output refs.
*/
export function getActions(
  tokenIn: string,
  tokenOut: string,
  swaps: SwapV2[],
  assets: string[],
  amountOut: string
): Action[] {
  const tokenInIndex = assets.findIndex(
    (t) => t.toLowerCase() === tokenIn.toLowerCase()
  );
  const tokenOutIndex = assets.findIndex(
    (t) => t.toLowerCase() === tokenOut.toLowerCase()
  );
  const actions: Action[] = [];
  let opRefKey = 0;
  for (const swap of swaps) {
    let type = 'swap';
    let minOut = '0';
    const opRef: OutputReference[] = [];
    if (isJoin(swap, assets)) {
      type = 'join';
    } else if (isExit(swap, assets)) {
      type = 'exit';
    }
    if (
      swap.assetInIndex === tokenInIndex &&
      swap.assetOutIndex === tokenOutIndex
    ) {
      minOut = amountOut;
    } else if (swap.assetInIndex === tokenInIndex) {
      opRef.push(getOutputRef(opRefKey, swap.assetOutIndex));
      opRefKey++;
    } else if (swap.assetOutIndex === tokenOutIndex) {
      swap.amount = Relayer.toChainedReference(opRefKey - 1).toString();
      minOut = amountOut;
    } else {
      if (type === 'join' || type === 'exit')
        swap.amount = Relayer.toChainedReference(opRefKey - 1).toString();

      opRef.push(getOutputRef(opRefKey, swap.assetOutIndex));
      opRefKey++;
    }
    actions.push({
      type,
      swaps: [swap],
      opRef,
      minOut,
    });
  }
  return actions;
}
