import { Findable } from '../types';
import { PoolAttribute, PoolsRepositoryFetchOptions } from './types';
import { GraphQLQuery, Pool } from '@/types';
import BalancerAPIClient from '@/modules/api/balancer-api.client';
import {
  GraphQLArgsBuilder,
  BalancerAPIArgsFormatter,
} from '@/lib/graphql/args-builder';
import { GraphQLArgs } from '@/lib/graphql/types';

interface PoolsBalancerAPIOptions {
  url: string;
  apiKey: string;
  query?: GraphQLQuery;
}

const DEFAULT_SKIP = 0;
const DEFAULT_FIRST = 10;

/**
 * Access pools using the Balancer GraphQL Api.
 *
 * Balancer's API URL: https://api.balancer.fi/query/
 */
export class PoolsBalancerAPIRepository
  implements Findable<Pool, PoolAttribute>
{
  private client: BalancerAPIClient;
  public pools: Pool[] = [];
  public skip = 0; // Keep track of how many pools to skip on next fetch, so this functions similar to subgraph repository.
  public nextToken: string | undefined; // A token to pass to the next query to retrieve the next page of results.
  private query: GraphQLQuery;

  constructor(options: PoolsBalancerAPIOptions) {
    this.client = new BalancerAPIClient(options.url, options.apiKey);

    const defaultArgs: GraphQLArgs = {
      chainId: 1,
      orderBy: 'totalLiquidity',
      orderDirection: 'desc',
      where: {
        swapEnabled: {
          eq: true,
        },
        totalShares: {
          gt: 0.05,
        },
      },
    };

    const defaultAttributes = {
      id: true,
      address: true,
    };

    this.query = {
      args: Object.assign({}, options.query?.args || defaultArgs),
      attrs: Object.assign({}, options.query?.attrs || defaultAttributes),
    };

    // skip is not a valid argument for the Balancer API, it uses nextToken
    delete this.query.args.skip;
  }

  fetchFromCache(options?: PoolsRepositoryFetchOptions): Pool[] {
    const first = options?.first || DEFAULT_FIRST;
    const skip = options?.skip || DEFAULT_SKIP;

    const pools = this.pools.slice(skip, first + skip);
    this.skip = skip + first;
    return pools;
  }

  async fetch(options?: PoolsRepositoryFetchOptions): Promise<Pool[]> {
    if (
      this.pools.length >
      (options?.first || DEFAULT_FIRST) + (options?.skip || DEFAULT_SKIP)
    ) {
      return this.fetchFromCache(options);
    }

    if (this.nextToken) {
      this.query.args.nextToken = this.nextToken;
    }

    if (options?.first) {
      // We need to request more than they specified because filtering is done post limit
      // e.g. if we ask for 10 we may get 7 because 3 were filtered out.
      this.query.args.first = options.first * 2;
    }

    const formattedArgs = new GraphQLArgsBuilder(this.query.args).format(
      new BalancerAPIArgsFormatter()
    );

    const attrs = this.query.attrs;
    attrs.nextToken = true;

    const formattedQuery = {
      pools: {
        __args: formattedArgs,
        ...attrs,
      },
    };

    const apiResponse = await this.client.get(formattedQuery);
    const apiResponseData = apiResponse.pools;

    this.nextToken = apiResponseData.nextToken;
    this.pools = this.pools.concat(apiResponseData.pools.map(this.format));
    this.skip = this.pools.length;

    return this.fetchFromCache(options);
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
      return this.format(pool);
    }
  }

  /** Fixes any formatting issues from the subgraph
   *  - GraphQL can't store a map so pool.apr.[rewardAprs/tokenAprs].breakdown
   *    is JSON data that needs to be parsed so they match the Pool type correctly.
   */
  private format(pool: Pool): Pool {
    if (pool.apr?.rewardAprs.breakdown) {
      // GraphQL can't store this as a map so it's JSON that we must parse
      const rewardsBreakdown = JSON.parse(
        pool.apr?.rewardAprs.breakdown as unknown as string
      );
      pool.apr.rewardAprs.breakdown = rewardsBreakdown;
    }
    if (pool.apr?.tokenAprs.breakdown) {
      // GraphQL can't store this as a map so it's JSON that we must parse
      const tokenAprsBreakdown = JSON.parse(
        pool.apr?.tokenAprs.breakdown as unknown as string
      );
      pool.apr.tokenAprs.breakdown = tokenAprsBreakdown;
    }

    return pool;
  }
}
