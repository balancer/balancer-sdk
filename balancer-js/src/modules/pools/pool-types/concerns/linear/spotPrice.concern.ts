import { SpotPriceConcern } from '../types';
import { SubgraphPoolBase, LinearPool, ZERO } from '@balancer-labs/sor';

export class LinearPoolSpotPrice implements SpotPriceConcern {
  calcPoolSpotPrice(
    tokenIn: string,
    tokenOut: string,
    pool: SubgraphPoolBase
  ): string {
    const poolClass = LinearPool.fromPool(pool);
    const poolPairData = poolClass.parsePoolPairData(tokenIn, tokenOut);
    return poolClass
      ._spotPriceAfterSwapExactTokenInForTokenOut(poolPairData, ZERO)
      .toString();
  }
}
