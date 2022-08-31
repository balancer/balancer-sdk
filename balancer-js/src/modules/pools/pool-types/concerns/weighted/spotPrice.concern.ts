import { SpotPriceConcern } from '../types';
import { SubgraphPoolBase, WeightedPool, ZERO } from '@balancer-labs/sor';
import { Pool } from '@/types';

export class WeightedPoolSpotPrice implements SpotPriceConcern {
  calcPoolSpotPrice(tokenIn: string, tokenOut: string, pool: Pool): string {
    const weightedPool = WeightedPool.fromPool(pool as SubgraphPoolBase);
    const poolPairData = weightedPool.parsePoolPairData(tokenIn, tokenOut);
    return weightedPool
      ._spotPriceAfterSwapExactTokenInForTokenOut(poolPairData, ZERO)
      .toString();
  }
}
