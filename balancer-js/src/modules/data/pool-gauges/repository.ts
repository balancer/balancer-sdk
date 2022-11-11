/* eslint-disable @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any */
import { GaugesSubgraphRepository } from '@/modules/subgraph/repository';
import { PoolGauges, PoolGaugesAttributes } from './types';

export class PoolGaugesRepository extends GaugesSubgraphRepository<
  PoolGauges,
  PoolGaugesAttributes
> {
  async query(args: any): Promise<PoolGauges[]> {
    if (!args.block && this.blockHeight)
      args.block = { number: await this.blockHeight() };

    const { pools } = await this.client.PoolGauges(args);
    return pools.map(this.mapType);
  }

  mapType(fragment: any): PoolGauges {
    return fragment as PoolGauges;
  }
}
