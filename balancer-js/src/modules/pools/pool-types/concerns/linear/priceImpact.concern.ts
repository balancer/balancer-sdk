import { PriceImpactConcern } from '../types';
import { SubgraphPoolBase, LinearPool, ZERO } from '@balancer-labs/sor';

export class LinearPriceImpact implements PriceImpactConcern {
  calcPriceImpact(
    tokenAmounts: string[],
    isJoin: boolean,
    isExactOut: boolean,
    pool: SubgraphPoolBase
  ): string {
    const poolClass = LinearPool.fromPool(pool);
    return '';
  }
}
