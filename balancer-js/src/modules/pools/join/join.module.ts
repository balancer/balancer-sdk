import { Pools } from '@/modules/pools/pools.module';
import { PoolType } from '@/types';
import { JoinPoolAttributes } from '../pool-types/concerns/types';

export class Join {
  private pools: Pools;
  private wrappedNativeAsset: string;

  constructor(pools: Pools, wrappedNativeAsset: string) {
    this.pools = pools;
    this.wrappedNativeAsset = wrappedNativeAsset;
  }

  /**
   * Build join pool transaction parameters with exact tokens in and minimum BPT out based on slippage tolerance
   * @param {string}    joiner - Address used to join pool
   * @param {string}    poolId - Id of pool being joined
   * @param {string[]}  tokensIn - Token addresses provided for joining pool (same length and order as amountsIn)
   * @param {string[]}  amountsIn - Token amounts provided for joining pool in EVM amounts
   * @param {string}    slippage - Maximum slippage tolerance in bps i.e. 50 = 0.5%
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
      wrappedNativeAsset: this.wrappedNativeAsset,
    });
  }
}
