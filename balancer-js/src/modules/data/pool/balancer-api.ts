import { Findable } from '../types';
import { Pool_OrderBy, OrderDirection } from '@/modules/subgraph/subgraph';
import { PoolAttribute } from './types';
import { Pool } from '@/types';
import BalancerAPIClient from '@/modules/api/balancer-api.client';
import { id } from 'ethers/lib/utils';
import {
  PoolQuery,
  Op,
  BalancerAPIQueryFormatter,
} from '@/modules/pools/pool-query';

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

  async fetch(query?: PoolQuery): Promise<Pool[]> {
    const defaultQuery = new PoolQuery({
      orderBy: 'totalLiquidity',
      orderDirection: 'desc',
      where: {
        swapEnabled: Op.Equals(true),
        totalShares: Op.GreaterThan(0.05),
      },
    });

    query = query || defaultQuery;
    const formattedQuery = query.format(new BalancerAPIQueryFormatter());

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
