import { SpotPriceConcern } from '../types';
import { SubgraphPoolBase, WeightedPool, ZERO } from '@balancer-labs/sor';

export class WeightedPoolSpotPrice implements SpotPriceConcern {
  calcPoolSpotPrice(
    tokenIn: string,
    tokenOut: string,
    pool: SubgraphPoolBase
  ): string {
    const weightedPool = WeightedPool.fromPool(pool);
    const poolPairData = weightedPool.parsePoolPairData(tokenIn, tokenOut);
    return weightedPool
      ._spotPriceAfterSwapExactTokenInForTokenOut(poolPairData, ZERO)
      .toString();
  }
}
