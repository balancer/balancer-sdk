/* eslint @typescript-eslint/no-explicit-any: ["error", { "ignoreRestArgs": true }] */
import { ExitPoolRequest, JoinPoolRequest, Pool } from '@/types';
import { BigNumber } from '@ethersproject/bignumber';

export interface LiquidityConcern {
  calcTotal: (...args: any[]) => string;
}

export interface SpotPriceConcern {
  calcPoolSpotPrice: (tokenIn: string, tokenOut: string, pool: Pool) => string;
}

export interface PriceImpactConcern {
  bptZeroPriceImpact: (pool: Pool, tokenAmounts: bigint[]) => bigint;
  calcPriceImpact: (
    pool: Pool,
    tokenAmounts: string[],
    bptAmount: string
  ) => string;
}

export interface JoinConcern {
  buildJoin: ({
    joiner,
    pool,
    tokensIn,
    amountsIn,
    slippage,
    wrappedNativeAsset,
  }: JoinPoolParameters) => JoinPoolAttributes;
}

export interface ExitConcern {
  buildExitExactBPTIn: ({
    exiter,
    pool,
    bptIn,
    slippage,
    shouldUnwrapNativeAsset,
    wrappedNativeAsset,
    singleTokenMaxOut,
  }: ExitExactBPTInParameters) => ExitPoolAttributes;

  buildExitExactTokensOut: ({
    exiter,
    pool,
    tokensOut,
    amountsOut,
    slippage,
    wrappedNativeAsset,
  }: ExitExactTokensOutParameters) => ExitPoolAttributes;
}

export interface JoinPool {
  poolId: string;
  sender: string;
  recipient: string;
  joinPoolRequest: JoinPoolRequest;
}

export interface JoinPoolAttributes {
  to: string;
  functionName: string;
  attributes: JoinPool;
  data: string;
  value?: BigNumber;
  minBPTOut: string;
}

export interface JoinPoolParameters {
  joiner: string;
  pool: Pool;
  tokensIn: string[];
  amountsIn: string[];
  slippage: string;
  wrappedNativeAsset: string;
}

export interface ExitPool {
  poolId: string;
  sender: string;
  recipient: string;
  exitPoolRequest: ExitPoolRequest;
}

export interface ExitPoolAttributes {
  to: string;
  functionName: string;
  attributes: ExitPool;
  data: string;
  minAmountsOut: string[];
  maxBPTIn: string;
}

export interface ExitExactBPTInParameters {
  exiter: string;
  pool: Pool;
  bptIn: string;
  slippage: string;
  shouldUnwrapNativeAsset: boolean;
  wrappedNativeAsset: string;
  singleTokenMaxOut?: string;
}

export interface ExitExactTokensOutParameters {
  exiter: string;
  pool: Pool;
  tokensOut: string[];
  amountsOut: string[];
  slippage: string;
  wrappedNativeAsset: string;
}
