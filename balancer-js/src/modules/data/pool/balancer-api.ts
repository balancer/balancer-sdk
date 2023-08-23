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

const MAX_POOLS_PER_REQUEST = 1000;
const DEFAULT_SKIP = 0;
const DEFAULT_FIRST = 10;
const CHECK_TIMEOUT_SECONDS = 10;
const CHECK_INTERVAL_MS = 10;
const MAX_CHECKS = (CHECK_TIMEOUT_SECONDS * 1000) / CHECK_INTERVAL_MS;

function timeout(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  public nextToken: string | undefined | null; // A token to pass to the next query to retrieve the next page of results. Undefined initially, null when there are no more results.
  private query: GraphQLQuery;
  private hasFetched = false;
  private isFetching = false;

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

  private fetchFromCache(first: number, skip: number): Pool[] {
    const pools = this.pools.slice(skip, first + skip);
    return pools;
  }

  async fetch(options?: PoolsRepositoryFetchOptions): Promise<Pool[]> {
    const first = options?.first || DEFAULT_FIRST;
    const skip = options?.skip || DEFAULT_SKIP;

    if (!this.hasFetched) {
      this.fetchAll(options);
    }
    await this.awaitEnoughPoolsFetched(first, skip);
    return this.fetchFromCache(first, skip);
  }

  // Fetches all pools from the API in a loop and saves them to the cache.
  async fetchAll(options?: PoolsRepositoryFetchOptions): Promise<void> {
    this.isFetching = true;
    this.hasFetched = true;

    if (this.nextToken) {
      this.query.args.nextToken = this.nextToken;
    }

    this.query.args.first = MAX_POOLS_PER_REQUEST;
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

    if (this.nextToken) return await this.fetchAll(options);

    this.isFetching = false;
  }

  // A function that waits until enough pools have been loaded into the cache
  // or fetching has finished. Used so that all pools can be fetched in the
  // background, while fetch returns the first results to the user quickly.
  async awaitEnoughPoolsFetched(first: number, skip: number): Promise<void> {
    for (let totalChecks = 0; totalChecks < MAX_CHECKS; totalChecks++) {
      if (this.pools.length > first + skip) {
        return;
      }
      if (!this.isFetching) {
        return;
      }
      await timeout(CHECK_INTERVAL_MS);
    }

    return;
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
