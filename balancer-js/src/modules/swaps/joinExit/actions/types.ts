import { BigNumber } from '@ethersproject/bignumber';
import { SwapV2, SubgraphPoolBase } from '@balancer-labs/sor';
import {
  OutputReference,
  EncodeJoinPoolInput,
  ExitPoolData,
} from '@/modules/relayer/relayer.module';
import { Join } from './join';
import { Exit } from './exit';

export enum ActionStep {
  Direct,
  TokenIn,
  TokenOut,
  Middle,
}

export enum ActionType {
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
  amountIn: string;
  isBptIn: boolean;
}

export type Actions = Exit | BatchSwapAction | Join;

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
  amountIn: '',
  isBptIn: false,
};

export interface Action {
  type: ActionType.Join | ActionType.Exit;
  callData(pool: SubgraphPoolBase, wrappedNativeAsset: string): CallData;
  getAmountIn(pool: SubgraphPoolBase, wrappedNativeAsset: string): string;
  getAmountOut(): string;
  opRefKey: number;
}

export interface CallData {
  params: EncodeJoinPoolInput | ExitPoolData;
  encoded: string;
}
