import { SubgraphPool } from '@/modules/subgraph/subgraph';
import { Findable, Pool, PoolAttribute } from '@/types';
import { mapType } from '@/modules/data/pool/subgraph-helpers';

export class PoolsJsonRepository implements Findable<Pool, PoolAttribute> {
  private pools: Pool[] = [];

  constructor(
    readonly subgraphPools: { data: { pools: SubgraphPool[] } },
    chainId: number
  ) {
    this.pools = subgraphPools.data.pools.map((pool) => mapType(pool, chainId));
  }

  async find(id: string): Promise<Pool | undefined> {
    return this.pools.find((pool) => pool.id === id);
  }

  async findBy(param: PoolAttribute, value: string): Promise<Pool | undefined> {
    return this.pools.find((pool) => pool[param] === value);
  }
}
