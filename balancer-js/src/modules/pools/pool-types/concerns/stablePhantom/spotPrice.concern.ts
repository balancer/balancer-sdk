import { SpotPriceConcern } from '../types';
import { SubgraphPoolBase, PhantomStablePool, ZERO } from '@balancer-labs/sor';

export class StablePhantomPoolSpotPrice implements SpotPriceConcern {
  calcPoolSpotPrice(
    tokenIn: string,
    tokenOut: string,
    pool: SubgraphPoolBase
  ): string {
    const poolClass = PhantomStablePool.fromPool(pool);
    const poolPairData = poolClass.parsePoolPairData(tokenIn, tokenOut);
    return poolClass
      ._spotPriceAfterSwapExactTokenInForTokenOut(poolPairData, ZERO)
      .toString();
  }
}
