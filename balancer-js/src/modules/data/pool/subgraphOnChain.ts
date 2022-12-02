import { Findable, Searchable } from '../types';
import {
  createSubgraphClient,
  SubgraphClient,
  SubgraphPool,
  Pool_OrderBy,
  OrderDirection,
  SubgraphPoolTokenFragment,
} from '@/modules/subgraph/subgraph';
import {
  GraphQLArgsBuilder,
  SubgraphArgsFormatter,
} from '@/lib/graphql/args-builder';
import { GraphQLArgs } from '@/lib/graphql/types';
import { Provider } from '@ethersproject/providers';
import { PoolAttribute, PoolsRepositoryFetchOptions } from './types';
import { GraphQLQuery, Pool, PoolType, PoolToken } from '@/types';
import { Network } from '@/lib/constants/network';
import { PoolsQueryVariables } from '../../subgraph/subgraph';
import { getOnChainBalances } from './onChainData';

interface PoolsSubgraphOnChainRepositoryOptions {
  url: string;
  chainId: Network;
  provider: Provider;
  blockHeight?: () => Promise<number | undefined>;
  query?: GraphQLQuery;
}

/**
 * Access pools using generated subgraph client.
 *
 * Balancer's subgraph URL: https://thegraph.com/hosted-service/subgraph/balancer-labs/balancer-v2
 */
export class PoolsSubgraphOnChainRepository
  implements Findable<Pool, PoolAttribute>, Searchable<Pool>
{
  private client: SubgraphClient;
  private chainId: Network;
  private provider: Provider;
  private pools?: Promise<Pool[]>;
  public skip = 0;
  private blockHeight: undefined | (() => Promise<number | undefined>);
  private query: GraphQLQuery;

  /**
   * Repository with optional lazy loaded blockHeight
   *
   * @param url subgraph URL
   * @param chainId current network, needed for L2s logic
   * @param blockHeight lazy loading blockHeigh resolver
   */
  constructor(options: PoolsSubgraphOnChainRepositoryOptions) {
    this.client = createSubgraphClient(options.url);
    this.blockHeight = options.blockHeight;
    this.chainId = options.chainId;
    this.provider = options.provider;

    const defaultArgs: GraphQLArgs = {
      orderBy: Pool_OrderBy.TotalLiquidity,
      orderDirection: OrderDirection.Desc,
      where: {
        swapEnabled: {
          eq: true,
        },
        totalShares: {
          gt: 0,
        },
      },
    };

    const args = options.query?.args || defaultArgs;
    const attrs = options.query?.attrs || {};

    this.query = {
      args,
      attrs,
    };
  }

  /**
   * We need a list of all the pools, for calculating APRs (nested pools), and for SOR (path finding).
   * All the pools are fetched on page load and cachced for speedy lookups.
   *
   * @returns Promise resolving to pools list
   */
  private async fetchDefault(
    filter?: Record<string, unknown>
  ): Promise<Pool[]> {
    console.time('fetching pools');
    if (!filter) filter = await this.getDefaultFilter();
    const { pool0, pool1000, pool2000 } = await this.client.AllPools(filter);
    const pools = [...pool0, ...pool1000, ...pool2000].map(
      this.mapType.bind(this)
    );
    console.timeEnd('fetching pools');
    console.log(pools.length, 'Example filter should limit the pools length');
    console.log('Fetching onchain!');
    const onchainPools = await getOnChainBalances(
      pools,
      '0x77dCa2C955b15e9dE4dbBCf1246B4B85b651e50e', // These would need to be from config
      '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
      this.provider
    );

    return onchainPools;
  }

  async fetch(options?: PoolsRepositoryFetchOptions): Promise<Pool[]> {
    if (options?.skip) {
      this.query.args.skip = options.skip;
    }
    if (this.blockHeight) {
      this.query.args.block = { number: await this.blockHeight() };
    }

    this.query.args.first = options?.first || 1000;

    const formattedQuery = new GraphQLArgsBuilder(this.query.args).format(
      new SubgraphArgsFormatter()
    ) as PoolsQueryVariables;

    const { pools } = await this.client.Pools(formattedQuery);

    this.skip = (options?.skip || 0) + pools.length;

    return pools.map(this.mapType.bind(this));
  }

  async find(
    id: string,
    filter?: Record<string, unknown>
  ): Promise<Pool | undefined> {
    return await this.findBy('id', id, filter);
  }

  async findBy(
    param: PoolAttribute,
    value: string,
    filter?: Record<string, unknown>
  ): Promise<Pool | undefined> {
    if (!this.pools) {
      this.pools = this.fetchDefault(filter);
    }

    return (await this.pools).find((pool) => pool[param] == value);

    // TODO: @Nma - Fetching pools outside of default query is causing a lot of requests
    // on a frontend, because results aren't cached anywhere.
    // For fetching pools directly from subgraph with custom queries please use the client not this repository.
    // Code below kept for reference, to be removed later.
    //
    // if (this.pools) {
    //   return (await this.pools).find((p) => p[param] === value);
    // }
    // const { pools } = await this.client.Pools({
    //   where: {
    //     [param]: value,
    //     swapEnabled: true,
    //     totalShares_gt: '0.000000000001',
    //   },
    //   block: await this.block(),
    // });
    // const poolsTab: Pool[] = pools.map(this.mapType.bind(this));
    // return poolsTab.length > 0 ? poolsTab[0] : undefined;
  }

  async all(): Promise<Pool[]> {
    if (!this.pools) {
      this.pools = this.fetchDefault();
    }
    return this.pools;
  }

  async block(): Promise<{ number: number | undefined } | undefined> {
    return this.blockHeight ? { number: await this.blockHeight() } : undefined;
  }

  async getDefaultFilter(): Promise<Record<string, unknown>> {
    return {
      where: { swapEnabled: true, totalShares_gt: '0.000000000001' },
      orderBy: Pool_OrderBy.TotalLiquidity,
      orderDirection: OrderDirection.Desc,
      block: await this.block(),
    };
  }

  async where(filter: (pool: Pool) => boolean): Promise<Pool[]> {
    if (!this.pools) {
      this.pools = this.fetchDefault();
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
      poolTypeVersion: subgraphPool.poolTypeVersion || 1,
      swapFee: subgraphPool.swapFee,
      swapEnabled: subgraphPool.swapEnabled,
      protocolYieldFeeCache: subgraphPool.protocolYieldFeeCache || '0',
      amp: subgraphPool.amp ?? undefined,
      owner: subgraphPool.owner ?? undefined,
      factory: subgraphPool.factory ?? undefined,
      symbol: subgraphPool.symbol ?? undefined,
      tokens: (subgraphPool.tokens || []).map(this.mapToken),
      tokensList: subgraphPool.tokensList,
      tokenAddresses: (subgraphPool.tokens || []).map((t) => t.address),
      totalLiquidity: subgraphPool.totalLiquidity,
      totalShares: subgraphPool.totalShares,
      totalSwapFee: subgraphPool.totalSwapFee,
      totalSwapVolume: subgraphPool.totalSwapVolume,
      // onchain: subgraphPool.onchain,
      createTime: subgraphPool.createTime,
      mainIndex: subgraphPool.mainIndex ?? undefined,
      wrappedIndex: subgraphPool.wrappedIndex ?? undefined,
      // mainTokens: subgraphPool.mainTokens,
      // wrappedTokens: subgraphPool.wrappedTokens,
      // unwrappedTokens: subgraphPool.unwrappedTokens,
      // isNew: subgraphPool.isNew,
      // volumeSnapshot: subgraphPool.volumeSnapshot,
      // feesSnapshot: subgraphPool.???, // Approximated last 24h fees
      // boost: subgraphPool.boost,
      totalWeight: subgraphPool.totalWeight || '1',
      lowerTarget: subgraphPool.lowerTarget ?? '0',
      upperTarget: subgraphPool.upperTarget ?? '0',
    };
  }

  private mapToken(subgraphToken: SubgraphPoolTokenFragment): PoolToken {
    let subgraphTokenPool = null;
    if (subgraphToken.token?.pool) {
      subgraphTokenPool = {
        ...subgraphToken.token.pool,
        poolType: subgraphToken.token.pool.poolType as PoolType,
      };
    }
    return {
      ...subgraphToken,
      isExemptFromYieldProtocolFee:
        subgraphToken.isExemptFromYieldProtocolFee || false,
      token: {
        pool: subgraphTokenPool,
        latestUSDPrice: subgraphToken.token.latestUSDPrice || undefined,
      },
    };
  }
}
