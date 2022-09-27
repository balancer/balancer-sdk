import { Findable, Pool, Searchable } from '@/types';
import { PoolAttribute } from './types';

export class PoolsStaticRepository
  implements Findable<Pool, PoolAttribute>, Searchable<Pool>
{
  constructor(private pools: Pool[]) {}

  async find(id: string): Promise<Pool | undefined> {
    return this.pools.find((pool) => {
      return pool.id.toLowerCase() === id.toLowerCase();
    });
  }

  async findBy(
    attribute: PoolAttribute,
    value: string
  ): Promise<Pool | undefined> {
    return this.pools.find((pool) => {
      return pool[attribute] === value;
    });
  }

  async all(): Promise<Pool[]> {
    return this.pools;
  }

  async where(filter: (pool: Pool) => boolean): Promise<Pool[]> {
    return (await this.all()).filter(filter);
  }
}
