import { Pools } from '@/modules/pools/pools.module';
import { PoolType } from '@/types';
import { JoinPoolAttributes } from '../pool-types/concerns/types';

export class Join {
  private pools: Pools;

  constructor(pools: Pools) {
    this.pools = pools;
  }

  /**
   * Build join pool transaction parameters with exact tokens in and minimum BPT out based on slippage tolerance
   * @param {string}    joiner - Address used to join pool
   * @param {string}    poolId - Id of pool being joined
   * @param {string[]}  tokensIn - Array containing addresses of tokens to provide for joining pool. (must have same length and order as amountsIn)
   * @param {string[]}  amountsIn - Array containing amounts of tokens to provide for joining pool. (must have same length and order as tokensIn)
   * @param {string}    slippage - Maximum slippage tolerance in percentage. i.e. 0.05 = 5%
   * @returns           transaction request ready to send with signer.sendTransaction
   */
  async buildExactTokensInJoinPool(
    joiner: string,
    poolId: string,
    tokensIn: string[],
    amountsIn: string[],
    slippage: string
  ): Promise<JoinPoolAttributes> {
    const pool = await this.pools.findById(poolId);
    return Pools.from(
      pool.poolType as PoolType
    ).joinCalculator.buildExactTokensInJoinPool({
      joiner,
      pool,
      tokensIn,
      amountsIn,
      slippage,
    });
  }
}
