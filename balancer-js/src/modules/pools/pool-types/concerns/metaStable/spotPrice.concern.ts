import { SpotPriceConcern } from '../types';
import { SubgraphPoolBase, MetaStablePool, ZERO } from '@balancer-labs/sor';

export class MetaStablePoolSpotPrice implements SpotPriceConcern {
  calcPoolSpotPrice(
    tokenIn: string,
    tokenOut: string,
    pool: SubgraphPoolBase
  ): string {
    const poolClass = MetaStablePool.fromPool(pool);
    const poolPairData = poolClass.parsePoolPairData(tokenIn, tokenOut);
    return poolClass
      ._spotPriceAfterSwapExactTokenInForTokenOut(poolPairData, ZERO)
      .toString();
  }
}
