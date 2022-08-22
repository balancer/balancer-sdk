import { Findable } from '../types';
import { PoolAttribute } from './types';
import { GraphQLQuery, Pool } from '@/types';
import BalancerAPIClient from '@/modules/api/balancer-api.client';
import {
  GraphQLArgsBuilder,
  Op,
  BalancerAPIArgsFormatter,
} from '@/lib/graphql/args-builder';
import { GraphQLArgs } from '@/lib/graphql/types';

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
  public skip: string | undefined; // A token to pass to the next query to retrieve the next page of results.

  constructor(url: string, apiKey: string) {
    this.client = new BalancerAPIClient(url, apiKey);
  }

  async fetch(query?: GraphQLQuery): Promise<Pool[]> {
    const defaultArgs: GraphQLArgs = {
      chainId: 1,
      orderBy: 'totalLiquidity',
      orderDirection: 'desc',
      first: 10,
      where: {
        swapEnabled: Op.Equals(true),
        totalShares: Op.GreaterThan(0.05),
      },
    };

    const defaultAttributes = {
      id: true,
      address: true,
    };

    const args = query?.args || defaultArgs;
    const formattedArgs = new GraphQLArgsBuilder(args).format(
      new BalancerAPIArgsFormatter()
    );

    const attrs = query?.attrs || defaultAttributes;

    const formattedQuery = {
      pools: {
        __args: formattedArgs,
        ...attrs,
      },
    };

    const apiResponse = await this.client.get(formattedQuery);
    const apiResponseData = apiResponse.pools;

    this.skip = apiResponseData.skip;
    this.pools = apiResponseData.pools;

    return this.pools.map(this.format);
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
