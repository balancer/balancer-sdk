/**
 * Calculates pool fees
 *
 * 1. Pool fees in last 24hrs
 */
import { Pool, Findable, PoolAttribute } from '@/types';

export class PoolFees {
  constructor(
    private pool: Pool,
    private yesterdaysPools: Findable<Pool, PoolAttribute> | undefined
  ) {}

  // 🚨 this is adding 1 call to get yesterday's block height and 2nd call to fetch yesterday's pools data from subgraph
  // TODO: find a better data source for that eg. add blocks to graph, replace with a database, or dune
  async last24h(): Promise<number> {
    let yesterdaysPool;
    if (this.yesterdaysPools) {
      yesterdaysPool = await this.yesterdaysPools.find(this.pool.id);
    }
    if (!this.pool.totalSwapFee) {
      return 0;
    }
    if (!yesterdaysPool || !yesterdaysPool.totalSwapFee) {
      return parseFloat(this.pool.totalSwapFee);
    }
    return (
      parseFloat(this.pool.totalSwapFee) -
      parseFloat(yesterdaysPool.totalSwapFee)
    );
  }
}
