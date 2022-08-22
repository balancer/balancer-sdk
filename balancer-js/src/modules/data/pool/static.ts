import { Pool } from '@/types';
import { PoolAttribute, PoolRepository } from './types';

export class StaticPoolRepository implements PoolRepository {
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
}
