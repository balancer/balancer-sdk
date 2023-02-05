import { SpotPriceConcern } from '../types';
import { SubgraphPoolBase, PhantomStablePool, ZERO } from '@iguana-dex/sor';
import { Pool } from '@/types';

export class PhantomStablePoolSpotPrice implements SpotPriceConcern {
  calcPoolSpotPrice(tokenIn: string, tokenOut: string, pool: Pool): string {
    const metaStablePool = PhantomStablePool.fromPool(pool as SubgraphPoolBase);
    const poolPairData = metaStablePool.parsePoolPairData(tokenIn, tokenOut);
    return metaStablePool
      ._spotPriceAfterSwapExactTokenInForTokenOut(poolPairData, ZERO)
      .toString();
  }
}
