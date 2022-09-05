import { Findable } from '../types';
import { PoolAttribute, PoolsRepositoryFetchOptions } from './types';
import { GraphQLQuery, Pool } from '@/types';
import BalancerAPIClient from '@/modules/api/balancer-api.client';
import {
  GraphQLArgsBuilder,
  Op,
  BalancerAPIArgsFormatter,
} from '@/lib/graphql/args-builder';
import { GraphQLArgs } from '@/lib/graphql/types';

interface PoolsBalancerAPIOptions {
  url: string;
  apiKey: string;
  query?: GraphQLQuery;
}

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
        swapEnabled: Op.Equals(true),
        totalShares: Op.GreaterThan(0.05),
      },
    };

    const defaultAttributes = {
      id: true,
      address: true,
    };

    this.query = {
      args: options.query?.args || defaultArgs,
      attrs: options.query?.attrs || defaultAttributes,
    };
  }

  fetchFromCache(options?: PoolsRepositoryFetchOptions): Pool[] {
    const first = options?.first || 10;
    const skip = options?.skip || 0;

    if (this.pools.length > skip + first) {
      const pools = this.pools.slice(skip, first + skip);
      this.skip = skip + first;
      return pools;
    }

    return [];
  }

  async fetch(options?: PoolsRepositoryFetchOptions): Promise<Pool[]> {
    const poolsFromCache = this.fetchFromCache(options);
    if (poolsFromCache.length) return poolsFromCache;

    const formattedArgs = new GraphQLArgsBuilder(this.query.args).format(
      new BalancerAPIArgsFormatter()
    );

    const attrs = this.query.attrs;

    const formattedQuery = {
      pools: {
        __args: formattedArgs,
        ...attrs,
      },
    };

    const apiResponse = await this.client.get(formattedQuery);
    const apiResponseData = apiResponse.pools;

    this.nextToken = apiResponseData.skip;
    this.pools = apiResponseData.pools.map(this.format);

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
