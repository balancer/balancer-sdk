import { Findable } from '../types';
import { Pool_OrderBy, OrderDirection } from '@/modules/subgraph/subgraph';
import { PoolAttribute } from './types';
import { GraphQLQuery, Pool } from '@/types';
import BalancerAPIClient from '@/modules/api/balancer-api.client';
import { id } from 'ethers/lib/utils';
import {
  GraphQLArgs,
  GraphQLArgsBuilder,
  Op,
  BalancerAPIArgsFormatter,
} from '@/lib/utils/graphql-args-builder';

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

  constructor(url: string, apiKey: string) {
    this.client = new BalancerAPIClient(url, apiKey);
  }

  async fetch(query?: GraphQLQuery): Promise<Pool[]> {
    const defaultArgs: GraphQLArgs = {
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

    const args = query?.args || defaultArgs;
    const formattedArgs = new GraphQLArgsBuilder(args).format(
      new BalancerAPIArgsFormatter()
    );

    const attrs = query?.attrs || defaultAttributes;

    const formattedQuery = {
      Pools: {
        __args: formattedArgs,
        ...attrs,
      },
    };

    const apiResponseData = await this.client.get(formattedQuery);
    this.pools = apiResponseData.pools;

    return this.pools;
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
    return pool;
  }
}
