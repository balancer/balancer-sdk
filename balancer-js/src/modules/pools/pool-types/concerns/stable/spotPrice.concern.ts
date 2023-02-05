import { SpotPriceConcern } from '../types';
import { SubgraphPoolBase, StablePool, ZERO } from '@iguana-dex/sor';
import { Pool } from '@/types';

export class StablePoolSpotPrice implements SpotPriceConcern {
  calcPoolSpotPrice(tokenIn: string, tokenOut: string, pool: Pool): string {
    const stablePool = StablePool.fromPool(pool as SubgraphPoolBase);
    const poolPairData = stablePool.parsePoolPairData(tokenIn, tokenOut);
    return stablePool
      ._spotPriceAfterSwapExactTokenInForTokenOut(poolPairData, ZERO)
      .toString();
  }
}
