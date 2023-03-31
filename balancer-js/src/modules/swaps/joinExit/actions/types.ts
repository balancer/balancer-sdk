import { BigNumber } from '@ethersproject/bignumber';
import { SwapV2, SubgraphPoolBase } from '@balancer-labs/sor';
import {
  OutputReference,
  EncodeJoinPoolInput,
} from '@/modules/relayer/relayer.module';
import { Join } from './join';

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
  hasTokenIn: boolean;
  hasTokenOut: boolean;
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
  receiver: string;
  toInternal: boolean;
}

export interface SwapAction extends BaseAction {
  type: ActionType.Swap;
  swap: SwapV2;
  opRef: OutputReference[];
  amountIn: string;
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
  fromInternal: boolean;
  toInternal: boolean;
  limits: BigNumber[];
  approveTokens: string[];
  sender: string;
  receiver: string;
}

export type Actions = ExitAction | SwapAction | BatchSwapAction | Join;
export type OrderedActions = ExitAction | BatchSwapAction | Join;

export const EMPTY_BATCHSWAP_ACTION: BatchSwapAction = {
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

export interface Action {
  type: ActionType.Join;
  callData(pool: SubgraphPoolBase, wrappedNativeAsset: string): CallData;
  getAmountIn(pool: SubgraphPoolBase, wrappedNativeAsset: string): string;
  getAmountOut(): string;
  opRefKey: number;
}

export interface CallData {
  params: EncodeJoinPoolInput;
  encoded: string;
}
