import { Pools } from '@/modules/pools/pools.module';
import { BalancerError, BalancerErrorCode } from '@/balancerErrors';

export class Join {
  private pools: Pools;

  constructor(pools: Pools) {
    this.pools = pools;
  }

  /**
   * encodedExactTokensInJoinPool Joins user to desired pool with exact tokens in and minimum BPT out based on slippage tolerance
   * @param {string} joiner - Address used to join pool.
   * @param {string} poolId - Id of pool being joined.
   * @param {string[]} tokensIn - Array containing addresses of tokens to provide for joining pool. (must have same length and order as amountsIn)
   * @param {string[]} amountsIn - Array containing amounts of tokens to provide for joining pool. (must have same length and order as tokensIn)
   * @param {string} slippage - Slippage to be applied to swap section. i.e. 5%=50000000000000000.
   * @returns String with encoded transaction data.
   */
  async encodedExactTokensInJoinPool(
    joiner: string,
    poolId: string,
    tokensIn: string[],
    amountsIn: string[],
    slippage: string
  ): Promise<string> {
    const pool = await this.pools.findById(poolId);
    return Pools.from(pool).joinCalculator.encodedExactTokensInJoinPool({
      joiner,
      pool,
      tokensIn,
      amountsIn,
      slippage,
    });
  }
}
