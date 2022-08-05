import { Findable } from '../types';
import {
  createSubgraphClient,
  SubgraphClient,
  SubgraphPool,
  Pool_OrderBy,
  OrderDirection,
} from '@/modules/subgraph/subgraph';
import {
  PoolQuery,
  Op,
  SubgraphQueryFormatter,
} from '@/modules/pools/pool-query';
import { PoolAttribute } from './types';
import { Pool, PoolType } from '@/types';

/**
 * Access pools using generated subgraph client.
 *
 * Balancer's subgraph URL: https://thegraph.com/hosted-service/subgraph/balancer-labs/balancer-v2
 */
export class PoolsSubgraphRepository implements Findable<Pool, PoolAttribute> {
  private client: SubgraphClient;
  public pools: SubgraphPool[] = [];

  constructor(url: string) {
    this.client = createSubgraphClient(url);
  }

  async fetch(query?: PoolQuery): Promise<Pool[]> {
    const defaultQuery = new PoolQuery({
      orderBy: Pool_OrderBy.TotalLiquidity,
      orderDirection: OrderDirection.Desc,
      where: [
        new Op.Equals('swapEnabled', true),
        new Op.GreaterThan('totalShares', 0),
      ],
    });

    query = query || defaultQuery;
    const formattedQuery = query.format(new SubgraphQueryFormatter());

    const { pool0, pool1000 } = await this.client.Pools(formattedQuery.args);

    // TODO: how to best convert subgraph type to sdk internal type?
    this.pools = [...pool0, ...pool1000];

    return this.pools.map(this.mapType);
  }

  async find(id: string): Promise<Pool | undefined> {
    if (this.pools.length == 0) {
      await this.fetch();
    }

    return this.findBy('id', id);
  }

  async findBy(param: PoolAttribute, value: string): Promise<Pool | undefined> {
    if (this.pools.length == 0) {
      await this.fetch();
    }

    const pool = this.pools.find((pool) => pool[param] == value);
    if (pool) {
      return this.mapType(pool);
    }
    return undefined;
  }

  // async where(filters: Map<PoolAttribute, string>): Promise<Pool[]> {
  //   if (this.pools.length == 0) {
  //     await this.fetch();
  //   }
  //   const applyFilters = (pool: SubgraphPool) => {

  //   }

  //   const pools = this.pools.filter((pool) => {
  //     filters.
  //   });
  // }

  private mapType(subgraphPool: SubgraphPool): Pool {
    return {
      id: subgraphPool.id,
      address: subgraphPool.address,
      poolType: subgraphPool.poolType as PoolType,
      swapFee: subgraphPool.swapFee,
      // owner: subgraphPool.owner,
      // factory: subgraphPool.factory,
      tokens: subgraphPool.tokens || [],
      tokensList: subgraphPool.tokensList,
      tokenAddresses: (subgraphPool.tokens || []).map((t) => t.address),
      totalLiquidity: subgraphPool.totalLiquidity,
      totalShares: subgraphPool.totalShares,
      totalSwapFee: subgraphPool.totalSwapFee,
      totalSwapVolume: subgraphPool.totalSwapVolume,
      // onchain: subgraphPool.onchain,
      createTime: subgraphPool.createTime,
      // mainTokens: subgraphPool.mainTokens,
      // wrappedTokens: subgraphPool.wrappedTokens,
      // unwrappedTokens: subgraphPool.unwrappedTokens,
      // isNew: subgraphPool.isNew,
      // volumeSnapshot: subgraphPool.volumeSnapshot,
      feesSnapshot: this.last24hFees(subgraphPool.snapshots), // Approximated last 24h fees
      // boost: subgraphPool.boost,
    };
  }

  /**
   * Helper function to extract last 24h of fees from last two subgraph snapshots.
   */
  private last24hFees(
    snapshots: SubgraphPool['snapshots']
  ): string | undefined {
    if (
      !snapshots ||
      snapshots.length < 2 ||
      Math.floor(Date.now() / 1000) - snapshots[0].timestamp > 86400
    ) {
      return undefined;
    }

    const fees =
      parseFloat(snapshots[0].swapFees) - parseFloat(snapshots[1].swapFees);

    return fees.toString();
  }
}
