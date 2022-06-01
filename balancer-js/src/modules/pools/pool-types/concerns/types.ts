/* eslint @typescript-eslint/no-explicit-any: ["error", { "ignoreRestArgs": true }] */

import { SubgraphPoolBase } from '@balancer-labs/sor';
import { JoinPoolRequest } from '@/types';
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
  encodedExactTokensInJoinPool: (
    joiner: string,
    pool: SubgraphPoolBase,
    tokensIn: string[],
    amountsIn: string[],
    slippage: string
  ) => Promise<string>;
}

export interface JoinPool {
  poolId: string;
  sender: string;
  recipient: string;
  joinPoolRequest: JoinPoolRequest;
}

export type JoinPoolData = JoinPoolRequest & JoinPool;

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
