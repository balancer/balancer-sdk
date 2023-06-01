import { BigNumber, BigNumberish } from '@ethersproject/bignumber';

import { ExitPoolRequest, JoinPoolRequest } from '@/types';
import { SwapType, BatchSwapStep, FundManagement } from '@/modules/swaps/types';

export enum PoolKind {
  WEIGHTED = 0,
  LEGACY_STABLE,
  COMPOSABLE_STABLE,
  COMPOSABLE_STABLE_V2,
}

export type OutputReference = {
  index: number;
  key: BigNumber;
};

export interface EncodeBatchSwapInput {
  swapType: SwapType;
  swaps: BatchSwapStep[];
  assets: string[];
  funds: FundManagement;
  limits: string[];
  deadline: BigNumberish;
  value: BigNumberish;
  outputReferences: OutputReference[];
}

export interface EncodeExitPoolInput {
  poolId: string;
  poolKind: number;
  sender: string;
  recipient: string;
  outputReferences: OutputReference[];
  exitPoolRequest: ExitPoolRequest;
}

export interface EncodeJoinPoolInput {
  poolId: string;
  kind: number;
  sender: string;
  recipient: string;
  joinPoolRequest: JoinPoolRequest;
  value: BigNumberish;
  outputReference: string;
}

export interface EncodeWrapAaveDynamicTokenInput {
  staticToken: string;
  sender: string;
  recipient: string;
  amount: BigNumberish;
  fromUnderlying: boolean;
  outputReference: BigNumberish;
}

export interface EncodeUnwrapAaveStaticTokenInput {
  staticToken: string;
  sender: string;
  recipient: string;
  amount: BigNumberish;
  toUnderlying: boolean;
  outputReference: BigNumberish;
}

export interface EncodeUnwrapInput {
  wrappedToken: string;
  sender: string;
  recipient: string;
  amount: BigNumberish;
  outputReference: BigNumberish;
}

export interface EncodeUnwrapWstETHInput {
  sender: string;
  recipient: string;
  amount: BigNumberish;
  outputReference: BigNumberish;
}

export type ExitPoolData = ExitPoolRequest & EncodeExitPoolInput;
export type JoinPoolData = JoinPoolRequest & EncodeJoinPoolInput;
