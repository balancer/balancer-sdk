import { SpotPriceConcern } from '../types';
import { SubgraphPoolBase, LinearPool, ZERO } from '@balancer-labs/sor';
import { Pool } from '@/types';

export class LinearPoolSpotPrice implements SpotPriceConcern {
  calcPoolSpotPrice(
    tokenIn: string,
    tokenOut: string,
    pool: Pool,
    isDefault = false
  ): string {
    const linearPool = LinearPool.fromPool(pool as SubgraphPoolBase);
    if (isDefault) return '1';
    else {
      const poolPairData = linearPool.parsePoolPairData(tokenIn, tokenOut);
      return linearPool
        ._spotPriceAfterSwapExactTokenInForTokenOut(poolPairData, ZERO)
        .toString();
    }
  }
}
