import { Pools } from '@/modules/pools/pools.module';
import { JoinPoolAttributes } from '../pool-types/concerns/types';

export class Join {
  private pools: Pools;

  constructor(pools: Pools) {
    this.pools = pools;
  }

  /**
   * buildExactTokensInJoinPool Joins user to desired pool with exact tokens in and minimum BPT out based on slippage tolerance
   * @param {string} joiner - Address used to join pool.
   * @param {string} poolId - Id of pool being joined.
   * @param {string[]} tokensIn - Array containing addresses of tokens to provide for joining pool. (must have same length and order as amountsIn)
   * @param {string[]} amountsIn - Array containing amounts of tokens to provide for joining pool. (must have same length and order as tokensIn)
   * @param {string} slippage - Slippage to be applied to swap section. i.e. 5%=50000000000000000.
   * @returns String with encoded transaction data.
   */
  async buildExactTokensInJoinPool(
    joiner: string,
    poolId: string,
    tokensIn: string[],
    amountsIn: string[],
    slippage: string
  ): Promise<JoinPoolAttributes> {
    const pool = await this.pools.findById(poolId);
    return Pools.from(pool).joinCalculator.buildExactTokensInJoinPool({
      joiner,
      pool,
      tokensIn,
      amountsIn,
      slippage,
    });
  }
}
