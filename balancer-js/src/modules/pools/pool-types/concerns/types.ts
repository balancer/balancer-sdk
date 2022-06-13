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
  calcPriceImpact: (
    tokenAmounts: string[],
    isJoin: boolean,
    isExactOut: boolean,
    pool: SubgraphPoolBase
  ) => string;
}
