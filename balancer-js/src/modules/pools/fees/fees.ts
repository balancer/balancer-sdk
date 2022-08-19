/**
 * Calculates pool fees
 *
 * 1. Pool fees in last 24hrs
 */
import { Pool, Findable, PoolAttribute } from '@/types';

export class PoolFees {
  constructor(
    private pool: Pool,
    private yesterdaysPools: Findable<Pool, PoolAttribute>
  ) {}

  // 🚨 this is adding 1 call to get yesterday's block height and 2nd call to fetch yesterday's pools data from subgraph
  // TODO: find a better data source for that eg. add blocks to graph, replace with a database, or dune
  async last24h(): Promise<number> {
    const yesterdaysPool = await this.yesterdaysPools.find(this.pool.id);
    if (
      !this.pool.totalSwapFee ||
      !yesterdaysPool ||
      !yesterdaysPool.totalSwapFee
    ) {
      return 0;
    }

    return (
      parseFloat(this.pool.totalSwapFee) -
      parseFloat(yesterdaysPool.totalSwapFee)
    );
  }
}
