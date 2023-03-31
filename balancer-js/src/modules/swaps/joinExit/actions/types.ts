import { BigNumber } from '@ethersproject/bignumber';
import { SwapV2 } from '@balancer-labs/sor';
import { OutputReference } from '@/modules/relayer/relayer.module';

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

export type Actions = JoinAction | ExitAction | SwapAction | BatchSwapAction;
export type OrderedActions = JoinAction | ExitAction | BatchSwapAction;

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
