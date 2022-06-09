import { Pools } from '@/modules/pools/pools.module';
import { ExitPoolAttributes } from '../pool-types/concerns/types';

export class Exit {
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
  async buildExitExactBPTInForTokensOut(
    exiter: string,
    poolId: string,
    bptIn: string,
    slippage: string
  ): Promise<ExitPoolAttributes> {
    const pool = await this.pools.findById(poolId);
    return Pools.from(pool).exitCalculator.buildExitExactBPTInForTokensOut({
      exiter,
      pool,
      bptIn,
      slippage,
    });
  }
}
