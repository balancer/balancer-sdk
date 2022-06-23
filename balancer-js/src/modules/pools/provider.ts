import { Pool, PoolModel } from '@/types';
import { PoolRepository } from '@/modules/data';
import { Pools as PoolMethods } from './pools.module';

/**
 * Building pools from raw data injecting poolType specific methods
 */
export class PoolsProvider {
  constructor(private repository: PoolRepository) {}

  static wrap(data: Pool): PoolModel {
    const methods = PoolMethods.from(data.poolType);
    return {
      ...data,
      liquidity: async () => methods.liquidity.calcTotal(data.tokens),
      // TODO: spotPrice fails, because it needs a subgraphType,
      // either we refetch or it needs a type transformation from SDK internal to SOR (subgraph)
      // spotPrice: async (tokenIn: string, tokenOut: string) =>
      //   methods.spotPriceCalculator.calcPoolSpotPrice(tokenIn, tokenOut, data),
    };
  }

  async find(id: string): Promise<PoolModel | undefined> {
    const data = await this.repository.find(id);
    if (!data) return;

    return PoolsProvider.wrap(data);
  }

  async findBy(param: string, value: string): Promise<PoolModel | undefined> {
    if (param == 'id') {
      return this.find(value);
    } else if (param == 'address') {
      const data = await this.repository.findBy('address', value);
      if (!data) return;

      return PoolsProvider.wrap(data);
    } else {
      throw `search by ${param} not implemented`;
    }
  }
}
