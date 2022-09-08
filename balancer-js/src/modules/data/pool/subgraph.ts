import { Findable, Searchable } from '../types';
import {
  createSubgraphClient,
  SubgraphClient,
  SubgraphPool,
  Pool_OrderBy,
  OrderDirection,
} from '@/modules/subgraph/subgraph';
import { PoolAttribute } from './types';
import { Pool, PoolType } from '@/types';
import { Network } from '@/lib/constants/network';

/**
 * Access pools using generated subgraph client.
 *
 * Balancer's subgraph URL: https://thegraph.com/hosted-service/subgraph/balancer-labs/balancer-v2
 */
export class PoolsSubgraphRepository
  implements Findable<Pool, PoolAttribute>, Searchable<Pool>
{
  private client: SubgraphClient;
  private pools?: Promise<Pool[]>;

  /**
   * Repository with optional lazy loaded blockHeight
   *
   * @param url subgraph URL
   * @param chainId current network, needed for L2s logic
   * @param blockHeight lazy loading blockHeigh resolver
   */
  constructor(
    url: string,
    private chainId: Network,
    private blockHeight?: () => Promise<number | undefined>
  ) {
    this.client = createSubgraphClient(url);
  }

  async fetch(): Promise<Pool[]> {
    console.time('fetching pools');
    const { pool0, pool1000 } = await this.client.Pools({
      where: { swapEnabled: true, totalShares_gt: '0' },
      orderBy: Pool_OrderBy.TotalLiquidity,
      orderDirection: OrderDirection.Desc,
      block: this.blockHeight
        ? { number: await this.blockHeight() }
        : undefined,
    });
    console.timeEnd('fetching pools');

    // TODO: how to best convert subgraph type to sdk internal type?
    return [...pool0, ...pool1000].map(this.mapType.bind(this));
  }

  async find(id: string): Promise<Pool | undefined> {
    return await this.findBy('id', id);
  }

  async findBy(param: PoolAttribute, value: string): Promise<Pool | undefined> {
    if (!this.pools) {
      this.pools = this.fetch();
    }

    return (await this.pools).find((pool) => pool[param] == value);
  }

  async all(): Promise<Pool[]> {
    if (!this.pools) {
      this.pools = this.fetch();
    }
    return this.pools;
  }

  async where(filter: (pool: Pool) => boolean): Promise<Pool[]> {
    if (!this.pools) {
      this.pools = this.fetch();
    }

    return (await this.pools).filter(filter);
  }

  private mapType(subgraphPool: SubgraphPool): Pool {
    return {
      id: subgraphPool.id,
      name: subgraphPool.name || '',
      address: subgraphPool.address,
      chainId: this.chainId,
      poolType: subgraphPool.poolType as PoolType,
      swapFee: subgraphPool.swapFee,
      swapEnabled: subgraphPool.swapEnabled,
      amp: subgraphPool.amp || undefined,
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
      // feesSnapshot: subgraphPool.???, // Approximated last 24h fees
      // boost: subgraphPool.boost,
      totalWeight: subgraphPool.totalWeight || '1',
    };
  }
}
