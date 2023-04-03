import { SubgraphPoolBase } from '@balancer-labs/sor';
import {
  EncodeJoinPoolInput,
  ExitPoolData,
  EncodeBatchSwapInput,
} from '@/modules/relayer/relayer.module';
import { Join } from './join';
import { Exit } from './exit';
import { Swap } from './swap';

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

export type Actions = Exit | Swap | Join;

export interface Action {
  type: ActionType.Join | ActionType.Exit | ActionType.BatchSwap;
  callData(pool: SubgraphPoolBase, wrappedNativeAsset: string): CallData;
  getAmountIn(pool: SubgraphPoolBase, wrappedNativeAsset: string): string;
  getAmountOut(): string;
  opRefKey: number;
}

export interface CallData {
  params: EncodeJoinPoolInput | ExitPoolData | EncodeBatchSwapInput;
  encoded: string | string[];
}
