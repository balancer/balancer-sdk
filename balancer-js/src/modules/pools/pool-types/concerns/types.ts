/* eslint @typescript-eslint/no-explicit-any: ["error", { "ignoreRestArgs": true }] */

import { SubgraphPoolBase } from '@balancer-labs/sor';

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

export interface PriceImpactConcern {
  bptZeroPriceImpact: (
    pool: SubgraphPoolBase,
    tokenAmounts: bigint[]
  ) => bigint;
  calcPriceImpact: (
    pool: SubgraphPoolBase,
    tokenAmounts: string[],
    bptAmount: string
  ) => string;
}
