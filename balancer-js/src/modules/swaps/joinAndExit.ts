import { Interface } from '@ethersproject/abi';
import { BigNumber } from 'ethers';
import { MaxInt256 } from '@ethersproject/constants';
import {
  SubgraphPoolBase,
  SwapInfo,
  SwapTypes,
  SwapV2,
} from '@balancer-labs/sor';
import {
  Relayer,
  OutputReference,
  EncodeJoinPoolInput,
  EncodeBatchSwapInput,
  ExitPoolData,
} from '@/modules/relayer/relayer.module';
import { getPoolAddress } from '@/pool-utils';
import { ExitPoolRequest } from '@/types';
import { FundManagement, SwapType } from './types';
import { WeightedPoolEncoder } from '@/pool-weighted';
import { AssetHelpers } from '@/lib/utils';
import { addSlippage, subSlippage } from '@/lib/utils/slippageHelper';
import { BalancerError, BalancerErrorCode } from '@/balancerErrors';

import balancerRelayerAbi from '@/lib/abi/BalancerRelayer.json';

export enum ActionStep {
  Direct,
  TokenIn,
  TokenOut,
  Middle,
}

export enum ActionType {
  Swap,
  BatchSwap,
  Join,
  Exit,
}
interface BaseAction {
  type: ActionType;
  minOut: string;
  assets: string[];
}

export interface JoinAction extends BaseAction {
  type: ActionType.Join;
  poolId: string;
  tokenIn: string;
  bpt: string;
  opRef: OutputReference;
  amountIn: string;
  actionStep: ActionStep;
}

export interface ExitAction extends BaseAction {
  type: ActionType.Exit;
  poolId: string;
  tokenOut: string;
  bpt: string;
  opRef: OutputReference[];
  amountIn: string;
  actionStep: ActionStep;
}

export interface SwapAction extends BaseAction {
  type: ActionType.Swap;
  swap: SwapV2;
  opRef: OutputReference[];
  amountIn: string;
  actionStep: ActionStep;
}

export interface BatchSwapAction extends BaseAction {
  type: ActionType.BatchSwap;
  swaps: SwapV2[];
  opRef: OutputReference[];
  amountIn: string;
  hasTokenOut: boolean;
}

type Actions = JoinAction | ExitAction | SwapAction | BatchSwapAction;
type OrderedActions = JoinAction | ExitAction | BatchSwapAction;

const balancerRelayerInterface = new Interface(balancerRelayerAbi);

function getOutputRef(key: number, index: number): OutputReference {
  const keyRef = Relayer.toChainedReference(key);
  return { index: index, key: keyRef };
}

/**
 * Uses relayer to approve itself to act in behalf of the user
 * @param authorisation Encoded authorisation call.
 * @returns relayer approval call
 */
function buildSetRelayerApproval(
  authorisation: string,
  relayerAddress: string
): string {
  return Relayer.encodeSetRelayerApproval(relayerAddress, true, authorisation);
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
 * If its not the final action then we need an outputReferece to chain to next action as input
 * @param actionStep
 * @param tokenOutIndex
 * @param opRefKey
 * @returns
 */
function getActionOutputRef(
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
 * If the action contains tokenOut we need to use slippage to set limits
 * @param swapType
 * @param actionStep
 * @param amountOut
 * @param slippage
 * @returns
 */
function getActionMinOut(
  swapType: SwapTypes,
  actionStep: ActionStep,
  amountOut: string,
  slippage: string
): string {
  let minOut = '0';
  if (actionStep === ActionStep.Direct || actionStep === ActionStep.TokenOut) {
    if (swapType === SwapTypes.SwapExactIn)
      minOut = subSlippage(
        BigNumber.from(amountOut),
        BigNumber.from(slippage)
      ).toString();
    else
      minOut = addSlippage(
        BigNumber.from(amountOut),
        BigNumber.from(slippage)
      ).toString();
  }
  return minOut;
}

/**
 * If its not the first action then the amount will come from the previous output ref
 * @param swap
 * @param actionType
 * @param actionStep
 * @param opRefKey
 * @returns
 */
function getActionAmount(
  swap: SwapV2,
  actionType: ActionType,
  actionStep: ActionStep,
  opRefKey: number
): string {
  let amountIn = swap.amount;
  if (
    actionStep === ActionStep.TokenOut ||
    (actionStep === ActionStep.Middle && actionType === ActionType.Join) ||
    (actionStep === ActionStep.Middle && actionType === ActionType.Exit)
  ) {
    amountIn = Relayer.toChainedReference(opRefKey - 1).toString();
  }
  return amountIn;
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
function getActionStep(
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
export function getNumberOfOutputActions(actions: OrderedActions[]): number {
  let outputCount = 0;
  for (const a of actions) {
    if (a.type === ActionType.BatchSwap) {
      if (a.hasTokenOut) outputCount++;
    } else if (a.type === ActionType.Exit || a.type === ActionType.Join) {
      if (
        a.actionStep === ActionStep.Direct ||
        a.actionStep === ActionStep.TokenOut
      )
        outputCount++;
    }
  }
  return outputCount;
}

/**
 * Categorize each action into a Join, Middle or Exit.
 * @param actions
 * @param tokenIn
 * @param tokenOut
 * @returns
 */
export function categorizeActions(
  actions: Actions[],
  tokenIn: string,
  tokenOut: string
): Actions[] {
  const enterActions: Actions[] = [];
  const exitActions: Actions[] = [];
  const middleActions: Actions[] = [];
  for (const a of actions) {
    // joins/exits with tokenIn can always be done first
    if (
      a.type === ActionType.Exit &&
      a.bpt.toLowerCase() === tokenIn.toLowerCase()
    )
      enterActions.push(a);
    else if (
      a.type === ActionType.Join &&
      a.tokenIn.toLowerCase() === tokenIn.toLowerCase()
    )
      enterActions.push(a);
    // joins/exits with tokenOut (and not tokenIn) can always be done last
    else if (
      a.type === ActionType.Exit &&
      a.tokenOut.toLowerCase() === tokenOut.toLowerCase()
    )
      exitActions.push(a);
    else if (
      a.type === ActionType.Join &&
      a.bpt.toLowerCase() === tokenOut.toLowerCase()
    )
      exitActions.push(a);
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
): OrderedActions[] {
  const orderedActions: OrderedActions[] = [];
  // batchSwaps are a collection of swaps that can all be called in a single batchSwap
  let batchSwaps: BatchSwapAction = {
    type: ActionType.BatchSwap,
    swaps: [],
    opRef: [],
    minOut: '0',
    assets,
    amountIn: '0',
    hasTokenOut: false,
  };

  for (const a of allActions) {
    // batch neighbouring swaps together
    if (a.type === ActionType.Swap) {
      batchSwaps.swaps.push(a.swap);
      batchSwaps.opRef.push(...a.opRef);
      batchSwaps.minOut = a.minOut;
      if (a.actionStep === ActionStep.TokenOut || ActionStep.Direct)
        batchSwaps.hasTokenOut = true;
    } else {
      if (batchSwaps.swaps.length > 0) {
        orderedActions.push(batchSwaps);
        // new batchSwap collection as there is a chained join/exit inbetween
        batchSwaps = {
          type: ActionType.BatchSwap,
          swaps: [],
          opRef: [],
          minOut: '0',
          assets,
          amountIn: '0',
          hasTokenOut: false,
        };
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
 * @param tokenIn
 * @param tokenOut
 * @param assets
 * @returns
 */
export function orderActions(
  actions: Actions[],
  tokenIn: string,
  tokenOut: string,
  assets: string[]
): OrderedActions[] {
  const categorizedActions = categorizeActions(actions, tokenIn, tokenOut);
  const orderedActions = batchSwapActions(categorizedActions, assets);
  if (getNumberOfOutputActions(orderedActions) > 1)
    throw new BalancerError(BalancerErrorCode.RELAY_SWAP_LENGTH);
  return orderedActions;
}

/**
 * Translate each swap into an Action. An Action is a join/exit/swap with the chained output refs.
 * @param swapType
 * @param tokenIn
 * @param tokenOut
 * @param swaps
 * @param assets
 * @param amountOut
 * @param slippage
 * @returns
 */
export function getActions(
  swapType: SwapTypes,
  tokenIn: string,
  tokenOut: string,
  swaps: SwapV2[],
  assets: string[],
  amountOut: string,
  slippage: string
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
    if (isJoin(swap, assets)) {
      const [joinAction, newOpRefKey] = createJoinAction(
        swapType,
        swap,
        tokenInIndex,
        tokenOutIndex,
        amountOut,
        opRefKey,
        assets,
        slippage
      );
      opRefKey = newOpRefKey;
      actions.push(joinAction);
      continue;
    } else if (isExit(swap, assets)) {
      const [exitAction, newOpRefKey] = createExitAction(
        swapType,
        swap,
        tokenInIndex,
        tokenOutIndex,
        amountOut,
        opRefKey,
        assets,
        slippage
      );
      opRefKey = newOpRefKey;
      actions.push(exitAction);
      continue;
    } else {
      const [swapAction, newOpRefKey] = createSwapAction(
        swapType,
        swap,
        tokenInIndex,
        tokenOutIndex,
        amountOut,
        opRefKey,
        assets,
        slippage
      );
      opRefKey = newOpRefKey;
      actions.push(swapAction);
      continue;
    }
  }
  return actions;
}

/**
 * Create a JoinAction with relevant info.
 * @param swapType
 * @param swap
 * @param tokenInIndex
 * @param tokenOutIndex
 * @param amountOut
 * @param opRefKey
 * @param assets
 * @param slippage
 * @returns
 */
function createJoinAction(
  swapType: SwapTypes,
  swap: SwapV2,
  tokenInIndex: number,
  tokenOutIndex: number,
  amountOut: string,
  opRefKey: number,
  assets: string[],
  slippage: string
): [JoinAction, number] {
  const actionStep = getActionStep(
    tokenInIndex,
    tokenOutIndex,
    swap.assetInIndex,
    swap.assetOutIndex
  );
  const amountIn = getActionAmount(swap, ActionType.Join, actionStep, opRefKey);
  const minOut = getActionMinOut(swapType, actionStep, amountOut, slippage);
  const [opRef, newOpRefKey] = getActionOutputRef(
    actionStep,
    swap.assetOutIndex,
    opRefKey
  );
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
  };
  return [joinAction, newOpRefKey];
}

/**
 * Create a ExitAction with relevant info.
 * @param swapType
 * @param swap
 * @param tokenInIndex
 * @param tokenOutIndex
 * @param amountOut
 * @param opRefKey
 * @param assets
 * @param slippage
 * @returns
 */
function createExitAction(
  swapType: SwapTypes,
  swap: SwapV2,
  tokenInIndex: number,
  tokenOutIndex: number,
  amountOut: string,
  opRefKey: number,
  assets: string[],
  slippage: string
): [ExitAction, number] {
  const actionStep = getActionStep(
    tokenInIndex,
    tokenOutIndex,
    swap.assetInIndex,
    swap.assetOutIndex
  );
  const amountIn = getActionAmount(swap, ActionType.Exit, actionStep, opRefKey);
  const minOut = getActionMinOut(swapType, actionStep, amountOut, slippage);
  const [opRef, newOpRefKey] = getActionOutputRef(
    actionStep,
    swap.assetOutIndex,
    opRefKey
  );
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
  };
  return [exitAction, newOpRefKey];
}

/**
 * * Create a SwapAction with relevant info.
 * @param swapType
 * @param swap
 * @param tokenInIndex
 * @param tokenOutIndex
 * @param amountOut
 * @param opRefKey
 * @param assets
 * @param slippage
 * @returns
 */
function createSwapAction(
  swapType: SwapTypes,
  swap: SwapV2,
  tokenInIndex: number,
  tokenOutIndex: number,
  amountOut: string,
  opRefKey: number,
  assets: string[],
  slippage: string
): [SwapAction, number] {
  const actionStep = getActionStep(
    tokenInIndex,
    tokenOutIndex,
    swap.assetInIndex,
    swap.assetOutIndex
  );
  const amountIn = getActionAmount(swap, ActionType.Swap, actionStep, opRefKey);
  const minOut = getActionMinOut(swapType, actionStep, amountOut, slippage);
  const [opRef, newOpRefKey] = getActionOutputRef(
    actionStep,
    swap.assetOutIndex,
    opRefKey
  );
  swap.amount = amountIn;
  const swapAction: SwapAction = {
    type: ActionType.Swap,
    opRef: opRef.key ? [opRef] : [],
    minOut,
    amountIn,
    assets,
    actionStep,
    swap: swap,
  };
  return [swapAction, newOpRefKey];
}

/**
 * Creates encoded exitPool call.
 * @param pool
 * @param swapType
 * @param action
 * @param user
 * @param tokenOut
 * @param relayerAddress
 * @param wrappedNativeAsset
 * @returns
 */
function buildExitCall(
  pool: SubgraphPoolBase,
  swapType: SwapTypes,
  action: ExitAction,
  user: string,
  tokenOut: string,
  relayerAddress: string,
  wrappedNativeAsset: string
): [string, string, string] {
  const assets = pool.tokensList;
  const assetHelpers = new AssetHelpers(wrappedNativeAsset);
  // tokens must have same order as pool getTokens
  const [sortedTokens] = assetHelpers.sortTokens(assets) as [string[]];
  const exitToken = action.tokenOut;
  const exitTokenIndex = sortedTokens.findIndex(
    (t) => t.toLowerCase() === exitToken.toLowerCase()
  );
  let userData: string;
  let bptAmtIn: string;
  const minAmountsOut = Array(assets.length).fill('0');
  if (swapType === SwapTypes.SwapExactIn) {
    // Variable amount of token out
    minAmountsOut[exitTokenIndex] = action.minOut;
    // Uses exact amount in
    bptAmtIn = action.amountIn;
    userData = WeightedPoolEncoder.exitExactBPTInForOneTokenOut(
      bptAmtIn,
      exitTokenIndex
    );
  } else {
    // Uses exact amount of token out
    minAmountsOut[exitTokenIndex] = action.amountIn;
    // Variable amount of BPT in
    bptAmtIn = action.minOut; // maxBptIn
    userData = WeightedPoolEncoder.exitBPTInForExactTokensOut(
      minAmountsOut,
      bptAmtIn
    );
  }

  // Send to relayer unless this is main token out
  let toInternalBalance = true;
  if (exitToken.toLowerCase() === tokenOut.toLowerCase())
    toInternalBalance = false;

  const exitParams: ExitPoolData = {
    assets: sortedTokens,
    minAmountsOut,
    userData,
    toInternalBalance,
    poolId: action.poolId,
    poolKind: 0, // This will always be 0 to match supported Relayer types
    sender: user,
    recipient: toInternalBalance ? relayerAddress : user,
    outputReferences: action.opRef,
    exitPoolRequest: {} as ExitPoolRequest,
  };
  const callData = Relayer.constructExitCall(exitParams);
  const amountOut =
    action.actionStep === ActionStep.Direct ||
    action.actionStep === ActionStep.TokenOut
      ? minAmountsOut[exitTokenIndex]
      : '0';
  const amountIn =
    action.actionStep === ActionStep.Direct ||
    action.actionStep === ActionStep.TokenIn
      ? bptAmtIn
      : '0';
  return [callData, amountIn, amountOut];
}

/**
 * Creates encoded joinPool call.
 * @param pool
 * @param swapType
 * @param action
 * @param user
 * @param tokenIn
 * @param tokenOut
 * @param relayerAddress
 * @param wrappedNativeAsset
 * @returns
 */
function buildJoinCall(
  pool: SubgraphPoolBase,
  swapType: SwapTypes,
  action: JoinAction,
  user: string,
  tokenIn: string,
  tokenOut: string,
  relayerAddress: string,
  wrappedNativeAsset: string
): [string, string, string] {
  const assets = pool.tokensList;
  const assetHelpers = new AssetHelpers(wrappedNativeAsset);
  // tokens must have same order as pool getTokens
  const [sortedTokens] = assetHelpers.sortTokens(assets) as [string[]];
  const joinToken = action.tokenIn;
  const joinTokenIndex = sortedTokens.findIndex(
    (t) => t.toLowerCase() === joinToken.toLowerCase()
  );

  const maxAmountsIn = Array(assets.length).fill('0');
  let userData: string;
  let bptAmountOut: string;
  if (swapType === SwapTypes.SwapExactIn) {
    // Uses exact amounts of tokens in
    maxAmountsIn[joinTokenIndex] = action.amountIn;
    // Variable amount of BPT out
    bptAmountOut = action.minOut;
    userData = WeightedPoolEncoder.joinExactTokensInForBPTOut(
      maxAmountsIn,
      bptAmountOut
    );
  } else {
    // Uses variable amounts of tokens in
    maxAmountsIn[joinTokenIndex] = action.minOut;
    // Exact amount of BPT out
    bptAmountOut = action.amountIn;
    userData = WeightedPoolEncoder.joinTokenInForExactBPTOut(
      bptAmountOut,
      joinTokenIndex
    );
  }

  let fromInternalBalance = true;
  if (joinToken.toLowerCase() === tokenIn.toLowerCase())
    fromInternalBalance = false;

  let toInternalBalance = true;
  if (pool.address.toLowerCase() === tokenOut.toLowerCase())
    toInternalBalance = false;

  const attributes: EncodeJoinPoolInput = {
    poolId: action.poolId,
    sender: fromInternalBalance ? relayerAddress : user,
    recipient: toInternalBalance ? relayerAddress : user,
    kind: 0,
    joinPoolRequest: {
      assets: sortedTokens,
      maxAmountsIn,
      userData,
      fromInternalBalance,
    },
    value: '0',
    outputReferences: action.opRef.key ? action.opRef.key.toString() : '0',
  };

  // console.log(attributes);

  const callData = Relayer.constructJoinCall(attributes);
  const amountOut =
    action.actionStep === ActionStep.Direct ||
    action.actionStep === ActionStep.TokenOut
      ? bptAmountOut
      : '0';

  const amountIn =
    action.actionStep === ActionStep.Direct ||
    action.actionStep === ActionStep.TokenIn
      ? maxAmountsIn[joinTokenIndex]
      : '0';

  return [callData, amountIn, amountOut];
}

/**
 * Creates encoded batchSwap call.
 * @param action
 * @param user
 * @param swapType
 * @param tokenIn
 * @param tokenOut
 * @param swapAmount
 * @param pools
 * @param relayerAddress
 * @returns
 */
function buildBatchSwapCall(
  action: BatchSwapAction,
  user: string,
  swapType: SwapTypes,
  tokenIn: string,
  tokenOut: string,
  swapAmount: string,
  pools: SubgraphPoolBase[],
  relayerAddress: string
): [string[], string, string] {
  const tokenInIndex = action.swaps[0].assetInIndex;
  const tokenOutIndex = action.swaps[action.swaps.length - 1].assetOutIndex;
  let toInternalBalance = true;
  let fromInternalBalance = true;
  const calls: string[] = [];
  // For tokens going in to the Vault, the limit shall be a positive number. For tokens going out of the Vault, the limit shall be a negative number.
  const limits = Array(action.assets.length).fill('0');
  if (
    tokenOut.toLowerCase() === action.assets[tokenOutIndex].toLowerCase() ||
    pools.some(
      (p) =>
        p.address.toLowerCase() === action.assets[tokenOutIndex].toLowerCase()
    )
  ) {
    // If tokenOut is a BPT this needs to be false as we can't exit a pool from internal balances
    toInternalBalance = false;
    limits[tokenOutIndex] = BigNumber.from(action.minOut).mul(-1).toString();
  }

  let sender: string;
  if (tokenIn.toLowerCase() === action.assets[tokenInIndex].toLowerCase()) {
    fromInternalBalance = false;
    sender = user;
    limits[tokenInIndex] = swapAmount;
  } else if (
    pools.some(
      (p) =>
        p.address.toLowerCase() === action.assets[tokenInIndex].toLowerCase()
    )
  ) {
    // new pools have automatic infinite vault allowance, but not old ones
    const key = Relayer.fromChainedReference(action.swaps[0].amount);
    const readOnlyRef = Relayer.toChainedReference(key, false);
    const approval = Relayer.encodeApproveVault(
      action.assets[tokenInIndex],
      readOnlyRef.toString()
    );
    calls.push(approval);
    // If tokenIn is a BPT this needs to be false as we can't join a pool from internal balances
    fromInternalBalance = false;
    sender = relayerAddress;
    limits[tokenInIndex] = MaxInt256.toString();
  } else {
    sender = relayerAddress;
    limits[tokenInIndex] = MaxInt256.toString();
  }

  const funds: FundManagement = {
    sender,
    recipient: toInternalBalance ? relayerAddress : user,
    fromInternalBalance,
    toInternalBalance,
  };

  const batchSwapInput: EncodeBatchSwapInput = {
    swapType:
      swapType === SwapTypes.SwapExactIn
        ? SwapType.SwapExactIn
        : SwapType.SwapExactOut,
    swaps: action.swaps,
    assets: action.assets,
    funds,
    limits,
    deadline: BigNumber.from(Math.ceil(Date.now() / 1000) + 3600), // 1 hour from now
    value: '0',
    outputReferences: action.opRef,
  };
  // console.log(batchSwapInput);

  const encodedBatchSwap = Relayer.encodeBatchSwap(batchSwapInput);
  calls.push(encodedBatchSwap);
  const amountIn =
    tokenIn.toLowerCase() === action.assets[tokenInIndex].toLowerCase()
      ? limits[tokenInIndex]
      : '0';
  const amountOut = action.hasTokenOut
    ? BigNumber.from(limits[tokenOutIndex]).abs().toString()
    : '0';
  return [calls, amountIn, amountOut];
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
  swapType: SwapTypes.SwapExactIn,
  pools: SubgraphPoolBase[],
  user: string,
  relayerAddress: string,
  wrappedNativeAsset: string,
  slippage: string,
  authorisation: string | undefined
): {
  to: string;
  data: string;
} {
  // For each 'swap' create a swap/join/exit action
  const actions = getActions(
    swapType,
    swapInfo.tokenIn,
    swapInfo.tokenOut,
    swapInfo.swaps,
    swapInfo.tokenAddresses,
    swapInfo.returnAmount.toString(),
    slippage
  );
  // Arrange action into order that will create minimal amount of calls
  const orderedActions = orderActions(
    actions,
    swapInfo.tokenIn,
    swapInfo.tokenOut,
    swapInfo.tokenAddresses
  );

  const calls: string[] = [];
  // These amounts are used to compare to expected amounts
  const amountsIn: BigNumber[] = [];
  const amountsOut: BigNumber[] = [];
  if (authorisation)
    calls.push(buildSetRelayerApproval(authorisation, relayerAddress));

  // Create encoded call for each action
  for (const action of orderedActions) {
    if (action.type === ActionType.Exit) {
      const pool = pools.find((p) => p.id === action.poolId);
      if (pool === undefined)
        throw new BalancerError(BalancerErrorCode.NO_POOL_DATA);
      const [call, amountIn, amountOut] = buildExitCall(
        pool,
        swapType,
        action,
        user,
        swapInfo.tokenOut,
        relayerAddress,
        wrappedNativeAsset
      );
      calls.push(call);
      amountsIn.push(BigNumber.from(amountIn));
      amountsOut.push(BigNumber.from(amountOut));
    }
    if (action.type === ActionType.Join) {
      const pool = pools.find((p) => p.id === action.poolId);
      if (pool === undefined)
        throw new BalancerError(BalancerErrorCode.NO_POOL_DATA);
      const [call, amountIn, amountOut] = buildJoinCall(
        pool,
        swapType,
        action,
        user,
        swapInfo.tokenIn,
        swapInfo.tokenOut,
        relayerAddress,
        wrappedNativeAsset
      );
      calls.push(call);
      amountsIn.push(BigNumber.from(amountIn));
      amountsOut.push(BigNumber.from(amountOut));
    }
    if (action.type === ActionType.BatchSwap) {
      const [batchSwapCalls, amountIn, amountOut] = buildBatchSwapCall(
        action,
        user,
        swapType,
        swapInfo.tokenIn,
        swapInfo.tokenOut,
        swapInfo.swapAmount.toString(),
        pools,
        relayerAddress
      );
      calls.push(...batchSwapCalls);
      amountsIn.push(BigNumber.from(amountIn));
      amountsOut.push(BigNumber.from(amountOut));
    }
  }

  // Safety check to make sure amounts/limits from calls match expected
  checkAmounts(amountsIn, amountsOut, swapType, swapInfo, slippage);
  // encode relayer multicall
  const callData = balancerRelayerInterface.encodeFunctionData('multicall', [
    calls,
  ]);

  return {
    to: relayerAddress,
    data: callData,
  };
}

function checkAmounts(
  amountsIn: BigNumber[],
  amountsOut: BigNumber[],
  swapType: SwapTypes,
  swapInfo: SwapInfo,
  slippage: string
): void {
  const totalIn = amountsIn.reduce(
    (total = BigNumber.from(0), amount) => (total = total.add(amount))
  );
  const totalOut = amountsOut.reduce(
    (total = BigNumber.from(0), amount) => (total = total.add(amount))
  );
  if (swapType === SwapTypes.SwapExactIn) {
    // totalIn should equal the original input swap amount
    // totalOut should equal the return amount from SOR minus any slippage allowance
    if (
      !totalIn.eq(swapInfo.swapAmount) ||
      !totalOut.eq(subSlippage(swapInfo.returnAmount, BigNumber.from(slippage)))
    )
      throw new BalancerError(BalancerErrorCode.RELAY_SWAP_AMOUNTS);
  } else {
    // totalIn should equal the return amount from SOR (this is the amount in) plus any slippage allowance
    // totalOut should equal the original input swap amount (the exact amount out)
    if (
      !totalIn.eq(
        addSlippage(swapInfo.returnAmount, BigNumber.from(slippage))
      ) ||
      !totalOut.eq(swapInfo.swapAmount)
    )
      throw new BalancerError(BalancerErrorCode.RELAY_SWAP_AMOUNTS);
  }
}
