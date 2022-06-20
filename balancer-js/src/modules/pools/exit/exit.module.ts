import { Pools } from '@/modules/pools/pools.module';
import { PoolType } from '@/types';
import { ExitPoolAttributes } from '../pool-types/concerns/types';

export class Exit {
  private pools: Pools;

  constructor(pools: Pools) {
    this.pools = pools;
  }

  /**
   * Build exit pool transaction parameters with exact BPT in and minimum tokens out based on slippage tolerance
   * @param {string}  exiter - Address used to exit pool
   * @param {string}  poolId - Id of pool being exited
   * @param {string}  bptIn - Amount of BPT to provide for exiting pool
   * @param {string}  slippage - Maximum slippage tolerance in percentage. i.e. 0.05 = 5%
   * @returns         transaction request ready to send with signer.sendTransaction
   */
  async buildExitExactBPTInForTokensOut(
    exiter: string,
    poolId: string,
    bptIn: string,
    slippage: string
  ): Promise<ExitPoolAttributes> {
    const pool = await this.pools.findById(poolId);
    return Pools.from(
      pool.poolType as PoolType
    ).exitCalculator.buildExitExactBPTInForTokensOut({
      exiter,
      pool,
      bptIn,
      slippage,
    });
  }
}
