/* eslint @typescript-eslint/no-explicit-any: ["error", { "ignoreRestArgs": true }] */

import { SubgraphPoolBase } from '@balancer-labs/sor';
import { JoinPoolRequest, ExitPoolRequest } from '@/types';
import { BigNumber } from '@ethersproject/bignumber';

export interface LiquidityConcern {
  calcTotal: (...args: any[]) => string;
}

export interface SpotPriceConcern {
  calcPoolSpotPrice: (
    tokenIn: string,
    tokenOut: string,
    pool: SubgraphPoolBase
  ) => string;
}

export interface JoinConcern {
  buildExactTokensInJoinPool: ({
    joiner,
    pool,
    tokensIn,
    amountsIn,
    slippage,
  }: ExactTokensInJoinPoolParameters) => Promise<JoinPoolAttributes>;
}

export interface ExitConcern {
  buildExitExactBPTInForTokensOut: ({
    exiter,
    pool,
    bptIn,
    slippage,
  }: ExitExactBPTInForTokensOutParameters) => Promise<ExitPoolAttributes>;
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
}

export interface ExactTokensInJoinPoolParameters {
  joiner: string;
  pool: SubgraphPoolBase;
  tokensIn: string[];
  amountsIn: string[];
  slippage: string;
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
  value?: BigNumber;
}

export interface ExitExactBPTInForTokensOutParameters {
  exiter: string;
  pool: SubgraphPoolBase;
  bptIn: string;
  slippage: string;
}
