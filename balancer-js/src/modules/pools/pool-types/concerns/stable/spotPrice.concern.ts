import { SpotPriceConcern } from '../types';
import { SubgraphPoolBase, StablePool, ZERO } from '@balancer-labs/sor';

export class StablePoolSpotPrice implements SpotPriceConcern {
  calcPoolSpotPrice(
    tokenIn: string,
    tokenOut: string,
    pool: SubgraphPoolBase
  ): string {
    const poolClass = StablePool.fromPool(pool);
    const poolPairData = poolClass.parsePoolPairData(tokenIn, tokenOut);
    return poolClass
      ._spotPriceAfterSwapExactTokenInForTokenOut(poolPairData, ZERO)
      .toString();
  }
}
