import { Findable, Searchable } from '../types';
import {
  createSubgraphClient,
  SubgraphClient,
  Pool_OrderBy,
  OrderDirection,
} from '@/modules/subgraph/subgraph';
import {
  GraphQLArgsBuilder,
  SubgraphArgsFormatter,
} from '@/lib/graphql/args-builder';
import { GraphQLArgs } from '@/lib/graphql/types';
import { PoolAttribute, PoolsRepositoryFetchOptions } from './types';
import { GraphQLQuery, Pool } from '@/types';
import { Network } from '@/lib/constants/network';
import { PoolsQueryVariables } from '../../subgraph/subgraph';
import { mapType } from './subgraph-helpers';
import { Logger } from '@/lib/utils/logger';

interface PoolsSubgraphRepositoryOptions {
  url: string;
  chainId: Network;
  blockHeight?: () => Promise<number | undefined>;
  query?: GraphQLQuery;
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
        totalShares: {
          gt: 0.000000000001,
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
  private async fetchAllPools(): Promise<Pool[]> {
    const logger = Logger.getInstance();
    logger.time('fetching pools');

    if (this.blockHeight) {
      this.query.args.block = { number: await this.blockHeight() };
    }
    const formattedQuery = new GraphQLArgsBuilder(this.query.args).format(
      new SubgraphArgsFormatter()
    ) as PoolsQueryVariables;

    const { pool0, pool1000, pool2000 } = await this.client.AllPools(
      formattedQuery
    );
    logger.timeEnd('fetching pools');

    return [...pool0, ...pool1000, ...pool2000].map((pool) =>
      mapType(pool, this.chainId)
    );
  }

  async fetch(options?: PoolsRepositoryFetchOptions): Promise<Pool[]> {
    const logger = Logger.getInstance();
    logger.time('fetching pools');
    if (options?.skip) {
      this.query.args.skip = options.skip;
    }
    if (this.blockHeight) {
      this.query.args.block = { number: await this.blockHeight() };
    }

    this.query.args.first = options?.first || this.query.args.first || 1000;

    const formattedQuery = new GraphQLArgsBuilder(this.query.args).format(
      new SubgraphArgsFormatter()
    ) as PoolsQueryVariables;

    const { pools } = await this.client.Pools(formattedQuery);

    this.skip = (options?.skip || 0) + pools.length;
    logger.timeEnd('fetching pools');

    return pools.map((pool) => mapType(pool, this.chainId));
  }

  async find(id: string): Promise<Pool | undefined> {
    return await this.findBy('id', id);
  }

  async findBy(param: PoolAttribute, value: string): Promise<Pool | undefined> {
    if (!this.pools) {
      this.pools = this.fetchAllPools();
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
      this.pools = this.fetchAllPools();
    }
    return this.pools;
  }

  async block(): Promise<{ number: number | undefined } | undefined> {
    return this.blockHeight ? { number: await this.blockHeight() } : undefined;
  }

  async where(filter: (pool: Pool) => boolean): Promise<Pool[]> {
    if (!this.pools) {
      this.pools = this.fetchAllPools();
    }

    return (await this.pools).filter(filter);
  }
}
