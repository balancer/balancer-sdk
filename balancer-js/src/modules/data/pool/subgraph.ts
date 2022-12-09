import { Findable, Searchable } from '../types';
import {
  createSubgraphClient,
  SubgraphClient,
  SubgraphPool,
  Pool_OrderBy,
  OrderDirection,
  SubgraphPoolTokenFragment,
  SubgraphSubPoolFragment,
  SubgraphSubPoolTokenFragment,
} from '@/modules/subgraph/subgraph';
import {
  GraphQLArgsBuilder,
  SubgraphArgsFormatter,
} from '@/lib/graphql/args-builder';
import { GraphQLArgs } from '@/lib/graphql/types';
import { PoolAttribute, PoolsRepositoryFetchOptions } from './types';
import {
  GraphQLQuery,
  Pool,
  PoolType,
  PoolToken,
  SubPool,
  SubPoolMeta,
} from '@/types';
import { Network } from '@/lib/constants/network';
import { PoolsQueryVariables } from '../../subgraph/subgraph';

interface PoolsSubgraphRepositoryOptions {
  url: string;
  chainId: Network;
  blockHeight?: () => Promise<number | undefined>;
  query?: GraphQLQuery;
}

interface SubgraphSubPoolToken extends SubgraphSubPoolTokenFragment {
  token?: SubgraphSubPoolMeta | null;
}

interface SubgraphSubPoolMeta {
  latestUSDPrice?: string | null;
  pool?: SubgraphSubPool | null;
}

interface SubgraphSubPool extends SubgraphSubPoolFragment {
  tokens: SubgraphSubPoolToken[];
}

/**
 * Access pools using generated subgraph client.
 *
 * Balancer's subgraph URL: https://thegraph.com/hosted-service/subgraph/balancer-labs/balancer-v2
 */
export class PoolsSubgraphRepository
  implements Findable<Pool, PoolAttribute>, Searchable<Pool>
{
  private client: SubgraphClient;
  private chainId: Network;
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
  constructor(options: PoolsSubgraphRepositoryOptions) {
    this.client = createSubgraphClient(options.url);
    this.blockHeight = options.blockHeight;
    this.chainId = options.chainId;

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

    const args = Object.assign({}, options.query?.args || defaultArgs);
    const attrs = Object.assign({}, options.query?.attrs || {});

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
  private async fetchDefault(): Promise<Pool[]> {
    console.time('fetching pools');
    const { pool0, pool1000, pool2000 } = await this.client.AllPools({
      where: { swapEnabled: true, totalShares_gt: '0.000000000001' },
      orderBy: Pool_OrderBy.TotalLiquidity,
      orderDirection: OrderDirection.Desc,
      block: await this.block(),
    });
    console.timeEnd('fetching pools');

    return [...pool0, ...pool1000, ...pool2000].map(this.mapType.bind(this));
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

  async find(id: string): Promise<Pool | undefined> {
    return await this.findBy('id', id);
  }

  async findBy(param: PoolAttribute, value: string): Promise<Pool | undefined> {
    if (!this.pools) {
      this.pools = this.fetchDefault();
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
      tokens: (subgraphPool.tokens || []).map(this.mapToken.bind(this)),
      tokensList: subgraphPool.tokensList,
      tokenAddresses: (subgraphPool.tokens || []).map((t) => t.address),
      totalLiquidity: subgraphPool.totalLiquidity,
      totalShares: subgraphPool.totalShares,
      totalSwapFee: subgraphPool.totalSwapFee,
      totalSwapVolume: subgraphPool.totalSwapVolume,
      priceRateProviders: subgraphPool.priceRateProviders ?? undefined,
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
    const subPoolInfo = this.mapSubPools(
      // need to typecast as the fragment is 3 layers deep while the type is infinite levels deep
      subgraphToken.token as SubgraphSubPoolMeta
    );
    return {
      ...subgraphToken,
      isExemptFromYieldProtocolFee:
        subgraphToken.isExemptFromYieldProtocolFee || false,
      token: subPoolInfo,
    };
  }

  private mapSubPools(metadata: SubgraphSubPoolMeta): SubPoolMeta {
    let subPool: SubPool | null = null;
    if (metadata.pool) {
      subPool = {
        id: metadata.pool.id,
        address: metadata.pool.address,
        totalShares: metadata.pool.totalShares,
        poolType: metadata.pool.poolType as PoolType,
        mainIndex: metadata.pool.mainIndex || 0,
      };

      if (metadata?.pool.tokens) {
        subPool.tokens = metadata.pool.tokens.map(
          this.mapSubPoolToken.bind(this)
        );
      }
    }

    return {
      pool: subPool,
      latestUSDPrice: metadata.latestUSDPrice || undefined,
    };
  }

  private mapSubPoolToken(token: SubgraphSubPoolToken) {
    return {
      address: token.address,
      decimals: token.decimals,
      symbol: token.symbol,
      balance: token.balance,
      priceRate: token.priceRate,
      weight: token.weight,
      isExemptFromYieldProtocolFee:
        token.isExemptFromYieldProtocolFee || undefined,
      token: token.token ? this.mapSubPools(token.token) : undefined,
    };
  }
}
