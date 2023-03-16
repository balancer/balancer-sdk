/* eslint-disable @typescript-eslint/no-unused-vars */
import { PriceImpactConcern } from '../types';
import { Pool } from '@/types';

export class LinearPriceImpact implements PriceImpactConcern {
  bptZeroPriceImpact(pool: Pool, tokenAmounts: bigint[]): bigint {
    throw new Error('Linear Pool bptZeroPriceImpact Not Implented');
  }
  calcPriceImpact(
    pool: Pool,
    tokenAmounts: bigint[],
    bptAmount: bigint,
    isJoin: boolean
  ): string {
    // Linear pools don't have price impact
    return '0';
  }
}
