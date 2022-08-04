import { Findable } from '../types';
import { Pool_OrderBy, OrderDirection } from '@/modules/subgraph/subgraph';
import { PoolAttribute } from './types';
import { Pool } from '@/types';
import BalancerAPIClient from '@/modules/api/balancer-api.client';
import { id } from 'ethers/lib/utils';

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

  async fetch(query?: any): Promise<Pool[]> {
    const defaultQuery = {
      pools: {
        __args: {
          where: {
            swapEnabled: true,
            totalShares: {
              gt: 0.05,
            },
          },
          orderBy: Pool_OrderBy.TotalLiquidity,
          orderDirection: OrderDirection.Desc,
        },
        id: true,
        address: true,
      },
    };

    const apiResponseData = await this.client.get(query || defaultQuery);
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
