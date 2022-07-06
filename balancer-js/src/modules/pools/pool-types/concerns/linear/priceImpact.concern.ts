import { PriceImpactConcern } from '../types';
import { SubgraphPoolBase } from '@balancer-labs/sor';

export class LinearPriceImpact implements PriceImpactConcern {
  bptZeroPriceImpact(pool: SubgraphPoolBase, amounts: string[]): string {
    throw new Error('Linear Pool bptZeroPriceImpact Not Implented');
  }
  calcPriceImpact(
    tokenAmounts: string[],
    isJoin: boolean,
    isExactOut: boolean,
    pool: SubgraphPoolBase
  ): string {
    throw new Error('Linear Pool Price Impact Not Implented');
  }
}
