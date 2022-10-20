import { cloneDeep } from 'lodash';
import { Interface } from '@ethersproject/abi';
import { BigNumber } from 'ethers';
import { MaxInt256, MaxUint256 } from '@ethersproject/constants';
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
  sender: string;
  receiver: string;
  fromInternal: boolean;
}

export interface ExitAction extends BaseAction {
  type: ActionType.Exit;
  poolId: string;
  tokenOut: string;
  bpt: string;
  opRef: OutputReference[];
  amountIn: string;
  actionStep: ActionStep;
  sender: string;
}

export interface SwapAction extends BaseAction {
  type: ActionType.Swap;
  swap: SwapV2;
  opRef: OutputReference[];
  amountIn: string;
  hasTokenIn: boolean;
  hasTokenOut: boolean;
  fromInternal: boolean;
  toInternal: boolean;
  sender: string;
  receiver: string;
  isBptIn: boolean;
}

export interface BatchSwapAction extends BaseAction {
  type: ActionType.BatchSwap;
  swaps: SwapV2[];
  opRef: OutputReference[];
  hasTokenIn: boolean;
  hasTokenOut: boolean;
  fromInternal: boolean;
  toInternal: boolean;
  limits: BigNumber[];
  approveTokens: string[];
  sender: string;
  receiver: string;
}

const EMPTY_BATCHSWAP_ACTION: BatchSwapAction = {
  type: ActionType.BatchSwap,
  swaps: [],
  opRef: [],
  minOut: '0',
  assets: [],
  hasTokenIn: false,
  hasTokenOut: false,
  fromInternal: false,
  toInternal: false,
  limits: [],
  approveTokens: [],
  sender: '',
  receiver: '',
};

type Actions = JoinAction | ExitAction | SwapAction | BatchSwapAction;
type OrderedActions = JoinAction | ExitAction | BatchSwapAction;

const balancerRelayerInterface = new Interface(balancerRelayerAbi);

function getOutputRef(key: number, index: number): OutputReference {
  const keyRef = Relayer.toChainedReference(key);
  return { index: index, key: keyRef };
}

function isBpt(pools: SubgraphPoolBase[], token: string): boolean {
  return pools.some((p) => p.address.toLowerCase() === token.toLowerCase());
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
  /*
  batchSwaps are a collection of swaps that can all be called in a single batchSwap
  Can batch all swaps with same source
  Any swap without tokenIn && not BPT should be coming from internal balances
  Any swap with tokenIn or BPT should be coming from external balances
  */
  const orderedActions: OrderedActions[] = [];
  let batchSwaps = cloneDeep(EMPTY_BATCHSWAP_ACTION);
  batchSwaps.assets = assets;
  batchSwaps.limits = Array(assets.length).fill(BigNumber.from('0'));

  let isFirstSwap = true;
  let lastSwap: SwapAction = {} as SwapAction;

  for (const a of allActions) {
    if (a.type === ActionType.Swap) {
      if (isFirstSwap) {
        lastSwap = a;
        isFirstSwap = false;
      }
      if (a.isBptIn) {
        // Older pools don't have pre-approval so need to add this as a step
        batchSwaps.approveTokens.push(a.assets[a.swap.assetInIndex]);
      }
      // If swap has different send/receive params than previous then it will need to be done separately
      if (
        a.fromInternal !== lastSwap.fromInternal ||
        a.toInternal !== lastSwap.toInternal ||
        a.receiver !== lastSwap.receiver ||
        a.sender !== lastSwap.sender
      ) {
        if (batchSwaps.swaps.length > 0) {
          orderedActions.push(batchSwaps);
          batchSwaps = cloneDeep(EMPTY_BATCHSWAP_ACTION);
          batchSwaps.assets = assets;
          batchSwaps.limits = Array(assets.length).fill(BigNumber.from('0'));
        }
      }
      batchSwaps.swaps.push(a.swap);
      batchSwaps.opRef.push(...a.opRef);
      batchSwaps.fromInternal = a.fromInternal;
      batchSwaps.toInternal = a.toInternal;
      batchSwaps.sender = a.sender;
      batchSwaps.receiver = a.receiver;
      if (a.hasTokenIn) {
        batchSwaps.hasTokenIn = true;
        // We need to add amount for each swap that uses tokenIn to get correct total
        batchSwaps.limits[a.swap.assetInIndex] = batchSwaps.limits[
          a.swap.assetInIndex
        ].add(a.amountIn);
      } else {
        // This will be a chained swap/input amount
        batchSwaps.limits[a.swap.assetInIndex] = MaxInt256;
      }
      if (a.hasTokenOut) {
        // We need to add amount for each swap that uses tokenOut to get correct total
        batchSwaps.hasTokenOut = true;
        batchSwaps.limits[a.swap.assetOutIndex] = batchSwaps.limits[
          a.swap.assetOutIndex
        ].add(a.minOut);
      }
      lastSwap = a;
    } else {
      // Non swap action
      if (batchSwaps.swaps.length > 0) {
        orderedActions.push(batchSwaps);
        // new batchSwap collection as there is a chained join/exit inbetween
        batchSwaps = cloneDeep(EMPTY_BATCHSWAP_ACTION);
        batchSwaps.assets = assets;
        batchSwaps.limits = Array(assets.length).fill(BigNumber.from('0'));
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
  return orderedActions;
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
  swapType: SwapTypes,
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
    if (isJoin(swap, assets)) {
      const [joinAction, newOpRefKey] = createJoinAction(
        swapType,
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
      continue;
    } else if (isExit(swap, assets)) {
      const [exitAction, newOpRefKey] = createExitAction(
        swapType,
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
      continue;
    } else {
      const [swapAction, newOpRefKey] = createSwapAction(
        swapType,
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
      opRefKey = newOpRefKey;
      actions.push(swapAction);
      continue;
    }
  }
  return actions;
}

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
function createJoinAction(
  swapType: SwapTypes,
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
  const amountIn = getActionAmount(swap, ActionType.Join, actionStep, opRefKey);
  const minOut = getActionMinOut(
    swapType,
    actionStep,
    swap.returnAmount ?? '0',
    slippage
  );
  const [opRef, newOpRefKey] = getActionOutputRef(
    actionStep,
    swap.assetOutIndex,
    opRefKey
  );
  let sender = relayerAddress;
  let fromInternal = true;
  // If using mainTokenIn we can assume it comes from user
  if (actionStep === ActionStep.Direct || actionStep === ActionStep.TokenIn) {
    sender = user;
    fromInternal = false;
  }
  let receiver = relayerAddress;
  // If using mainTokenOut we can assume it goes to user
  if (actionStep === ActionStep.Direct || actionStep === ActionStep.TokenOut)
    receiver = user;

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
  };
  return [joinAction, newOpRefKey];
}

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
function createExitAction(
  swapType: SwapTypes,
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
  let sender = relayerAddress;
  if (actionStep === ActionStep.Direct || actionStep === ActionStep.TokenIn)
    sender = user;
  const amountIn = getActionAmount(swap, ActionType.Exit, actionStep, opRefKey);
  const minOut = getActionMinOut(
    swapType,
    actionStep,
    swap.returnAmount ?? '0',
    slippage
  );
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
    sender,
  };
  return [exitAction, newOpRefKey];
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
function createSwapAction(
  swapType: SwapTypes,
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
  const amountIn = getActionAmount(swap, ActionType.Swap, actionStep, opRefKey);
  // Updates swap data to use chainedRef if required
  swap.amount = amountIn;
  const minOut = getActionMinOut(
    swapType,
    actionStep,
    swap.returnAmount ?? '0',
    slippage
  );
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
    sender: action.sender,
    recipient: toInternalBalance ? relayerAddress : user,
    outputReferences: action.opRef,
    exitPoolRequest: {} as ExitPoolRequest,
  };
  // console.log(exitParams);
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
 * @param action
 * @param wrappedNativeAsset
 * @returns
 */
function buildJoinCall(
  pool: SubgraphPoolBase,
  action: JoinAction,
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
    outputReferences: action.opRef.key ? action.opRef.key.toString() : '0',
  };

  // console.log(attributes);

  const callData = Relayer.constructJoinCall(attributes);
  // These are used for final amount check
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
 * @param swapType
 * @param tokenIn
 * @param tokenOut
 * @returns
 */
function buildBatchSwapCall(
  action: BatchSwapAction,
  swapType: SwapTypes.SwapExactIn,
  tokenIn: string,
  tokenOut: string
): [string[], string, string] {
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
    swapType:
      swapType === SwapTypes.SwapExactIn
        ? SwapType.SwapExactIn
        : SwapType.SwapExactOut,
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
  rawCalls: string[];
} {
  // For each 'swap' create a swap/join/exit action
  const actions = getActions(
    swapType,
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
        action,
        wrappedNativeAsset
      );
      calls.push(call);
      amountsIn.push(BigNumber.from(amountIn));
      amountsOut.push(BigNumber.from(amountOut));
    }
    if (action.type === ActionType.BatchSwap) {
      const [batchSwapCalls, amountIn, amountOut] = buildBatchSwapCall(
        action,
        swapType,
        swapInfo.tokenIn,
        swapInfo.tokenOut
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
    rawCalls: calls,
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
    // console.log(totalIn.toString(), 'totalIn');
    // console.log(swapInfo.swapAmount.toString(), 'swapInfo.swapAmount');
    // console.log(totalOut.toString(), 'totalOut');
    // console.log(
    //   subSlippage(swapInfo.returnAmount, BigNumber.from(slippage)).toString(),
    //   'slippage'
    // );
    // console.log(swapInfo.returnAmount.toString(), 'swapInfo.returnAmount');
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
