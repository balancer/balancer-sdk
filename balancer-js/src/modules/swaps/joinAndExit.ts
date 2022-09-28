import { SwapInfo, SwapV2 } from '@balancer-labs/sor';
import {
  Relayer,
  OutputReference,
  EncodeJoinPoolInput,
} from '@/modules/relayer/relayer.module';
import { getPoolAddress } from '@/pool-utils';
import { Interface } from '@ethersproject/abi';

import { ExitPoolRequest } from '@/types';
import balancerRelayerAbi from '@/lib/abi/BalancerRelayer.json';
import { WeightedPoolEncoder } from '@/pool-weighted';

interface Action {
  type: string;
  opRef: OutputReference[];
  swaps: SwapV2[];
  minOut: string;
}

// mainnet V4 - TODO - Make this part of config
const relayerAddress = '0x2536dfeeCB7A0397CF98eDaDA8486254533b1aFA';
// const relayerAddress = '0x886A3Ec7bcC508B8795990B60Fa21f85F9dB7948';

const balancerRelayerInterface = new Interface(balancerRelayerAbi);

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

/**
 * Encodes exitPool callData.
 * Exit staBal3 pool proportionally to underlying stables. Exits to relayer.
 * Outputreferences are used to store exit amounts for next transaction.
 *
 * @param sender Sender address.
 * @param amount Amount of staBal3 BPT to exit with.
 * @returns Encoded exitPool call. Output references.
 */
function buildExit(action: Action, user: string): string {
  // TODO
  const exitTokenIndex = 1;
  const userData = WeightedPoolEncoder.exitExactBPTInForOneTokenOut(
    action.swaps[0].amount,
    exitTokenIndex
  );

  // TODO -
  const assets: string[] = [
    '0xba100000625a3754423978a60c9317c58a424e3d',
    '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  ];
  const minAmountsOut = Array(assets.length).fill('0');
  minAmountsOut[exitTokenIndex] = action.minOut;

  const callData = Relayer.constructExitCall({
    assets,
    minAmountsOut,
    userData,
    toInternalBalance: false, // TODO - check this
    poolId: action.swaps[0].poolId,
    poolKind: 0, // This will always be 0 to match supported Relayer types
    sender: user,
    recipient: user,
    outputReferences: action.opRef,
    exitPoolRequest: {} as ExitPoolRequest,
  });
  return callData;
}

function buildJoin(action: Action, user: string): string {
  // TODO -
  const assets: string[] = [
    '0xba100000625a3754423978a60c9317c58a424e3d',
    '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  ];
  // TODO
  const joinTokenIndex = 1;
  const amountsIn = Array(assets.length).fill('0');
  amountsIn[joinTokenIndex] = action.swaps[0].amount;

  const userData = WeightedPoolEncoder.joinExactTokensInForBPTOut(
    amountsIn,
    action.minOut
  );

  const attributes: EncodeJoinPoolInput = {
    poolId: action.swaps[0].poolId,
    sender: user,
    recipient: user,
    kind: 0,
    joinPoolRequest: {
      assets,
      maxAmountsIn: amountsIn,
      userData,
      fromInternalBalance: false,
    },
    value: '0',
    outputReferences: '0', // TODO
  };

  const callData = Relayer.constructJoinCall(attributes);
  return callData;
}

/**
 * Uses relayer to approve itself to act in behalf of the user
 *
 * @param authorisation Encoded authorisation call.
 * @returns relayer approval call
 */
function buildSetRelayerApproval(authorisation: string): string {
  return Relayer.encodeSetRelayerApproval(relayerAddress, true, authorisation);
}

export function buildCalls(
  tokenIn: string,
  tokenOut: string,
  swapInfo: SwapInfo,
  user: string,
  authorisation: string
): {
  to: string;
  data: string;
} {
  const actions = getActions(
    tokenIn,
    tokenOut,
    swapInfo.swaps,
    swapInfo.tokenAddresses,
    swapInfo.returnAmount.toString()
  );
  const orderedActions = orderActions(
    actions,
    tokenIn,
    tokenOut,
    swapInfo.tokenAddresses
  );
  // TODO - Build call for each action
  const calls: string[] = [buildSetRelayerApproval(authorisation)];

  for (const action of orderedActions) {
    if (action.type === 'exit') calls.push(buildExit(action, user));
    if (action.type === 'join') calls.push(buildJoin(action, user));
  }

  const callData = balancerRelayerInterface.encodeFunctionData('multicall', [
    calls,
  ]);

  return {
    to: relayerAddress,
    data: callData,
  };
}
