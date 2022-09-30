/**
 * Calculates pool fees
 *
 * 1. Pool fees in last 24hrs
 */
import { Pool, Findable, PoolAttribute } from '@/types';

export class PoolVolume {
  constructor(
    private yesterdaysPools: Findable<Pool, PoolAttribute> | undefined
  ) {}

  // 🚨 this is adding 1 call to get yesterday's block height and 2nd call to fetch yesterday's pools data from subgraph
  // TODO: find a better data source for that eg. add blocks to graph, replace with a database, or dune
  async last24h(pool: Pool): Promise<number> {
    let yesterdaysPool;
    if (this.yesterdaysPools) {
      yesterdaysPool = await this.yesterdaysPools.find(pool.id);
    }

    if (!pool.totalSwapVolume) {
      return 0;
    }

    if (!yesterdaysPool || !yesterdaysPool.totalSwapVolume) {
      return parseFloat(pool.totalSwapVolume);
    }

    return (
      parseFloat(pool.totalSwapVolume) -
      parseFloat(yesterdaysPool.totalSwapVolume)
    );
  }
}
