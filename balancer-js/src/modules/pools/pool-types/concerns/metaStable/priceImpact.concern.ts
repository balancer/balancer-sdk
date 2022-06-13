import { PriceImpactConcern } from '../types';
import { SubgraphPoolBase, MetaStablePool, ZERO } from '@balancer-labs/sor';

export class MetaStablePoolPriceImpact implements PriceImpactConcern {
  calcPriceImpact(
    tokenAmounts: string[],
    isJoin: boolean,
    isExactOut: boolean,
    pool: SubgraphPoolBase
  ): string {
    const poolClass = MetaStablePool.fromPool(pool);
    return '';
  }
}
