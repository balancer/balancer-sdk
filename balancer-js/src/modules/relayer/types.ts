import { BigNumber, BigNumberish } from '@ethersproject/bignumber';

import { ExitPoolRequest, JoinPoolRequest } from '@/types';
import {
  SwapType,
  BatchSwapStep,
  FundManagement,
  FetchPoolsInput,
} from '@/modules/swaps/types';

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
  value: string;
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
  outputReferences: BigNumberish;
}

export interface ExitAndBatchSwapInput {
  exiter: string;
  swapRecipient: string;
  poolId: string;
  exitTokens: string[];
  userData: string;
  expectedAmountsOut: string[];
  finalTokensOut: string[];
  slippage: string;
  fetchPools: FetchPoolsInput;
}

export type ExitPoolData = ExitPoolRequest & EncodeExitPoolInput;
export type JoinPoolData = JoinPoolRequest & EncodeJoinPoolInput;
