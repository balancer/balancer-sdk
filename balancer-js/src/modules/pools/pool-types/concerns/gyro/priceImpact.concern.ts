import { PriceImpactConcern } from '@/modules/pools/pool-types/concerns/types';
import { Pool } from '@/types';

export class GyroPriceImpactConcern implements PriceImpactConcern {
  bptZeroPriceImpact(pool: Pool, tokenAmounts: bigint[]): bigint {
    console.log(pool, tokenAmounts);
    throw new Error('Not implemented');
  }

  calcPriceImpact(
    pool: Pool,
    tokenAmounts: bigint[],
    bptAmount: bigint,
    isJoin: boolean
  ): string {
    console.log(pool, tokenAmounts, bptAmount, isJoin);
    throw new Error('Not implemented');
  }
}
