import { SpotPriceConcern } from '../types';
import { SubgraphPoolBase, WeightedPool, ZERO } from '@balancer-labs/sor';
import { Pool, PoolToken } from '@/types';

export class WeightedPoolSpotPrice implements SpotPriceConcern {
  calcPoolSpotPrice(tokenIn: string, tokenOut: string, pool: Pool): string {
    const isBPTAsToken = tokenIn === pool.address || tokenOut === pool.address;
    if (isBPTAsToken) {
      const bptAsToken: PoolToken = {
        address: pool.address,
        balance: pool.totalShares,
        decimals: 18,
        priceRate: '1',
        weight: '0',
      };
      pool.tokens.push(bptAsToken);
      pool.tokensList.push(pool.address);
    }
    const weightedPool = WeightedPool.fromPool(pool as SubgraphPoolBase);
    const poolPairData = weightedPool.parsePoolPairData(tokenIn, tokenOut);
    const spotPrice = weightedPool
      ._spotPriceAfterSwapExactTokenInForTokenOut(poolPairData, ZERO)
      .toString();
    if (isBPTAsToken) {
      pool.tokens.pop();
      pool.tokensList.pop();
    }
    return spotPrice;
  }
}
