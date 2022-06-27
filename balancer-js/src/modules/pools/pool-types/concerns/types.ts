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

/*
The following idea is not being currently used

interface weightedPIInput {
  balances: string[];
  weights: string[];
}

interface metaStableInput {
  balances: string[];
  rates: string[];
}

export type PriceImpactInput = weightedPIInput | metaStableInput;
*/

export interface PriceImpactConcern {
  bptZeroPriceImpact: (pool: SubgraphPoolBase, amounts: string[]) => string;
  calcPriceImpact: (
    tokenAmounts: string[],
    isJoin: boolean,
    isExactOut: boolean,
    pool: SubgraphPoolBase
  ) => string;
}
