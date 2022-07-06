import { PriceImpactConcern } from '../types';
import { SubgraphPoolBase } from '@balancer-labs/sor';

export class LinearPriceImpact implements PriceImpactConcern {
  bptZeroPriceImpact(pool: SubgraphPoolBase, amounts: bigint[]): bigint {
    throw new Error('Linear Pool bptZeroPriceImpact Not Implented');
  }
  calcPriceImpact(
    pool: SubgraphPoolBase,
    tokenAmounts: string[],
    bptAmount: string
  ): string {
    throw new Error('Linear Pool Price Impact Not Implented');
  }
}
