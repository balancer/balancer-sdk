import type { BalancerDataRepositories, Pool, PoolModel } from '@/types';
import { PoolApr } from './apr/apr';
import { Liquidity } from '../liquidity/liquidity.module';
import { PoolFees } from './fees/fees';
import { PoolVolume } from './volume/volume';

// Can be changed outside for dependent services rate-limits
// eslint-disable-next-line prefer-const
export let POOLS_PER_PAGE = 10;

/**
 * Use-cases layer for generating live pools data
 */
export class ModelProvider {
  constructor(private repositories: BalancerDataRepositories) {}

  static async resolve(model: PoolModel): Promise<Pool> {
    return {
      ...model,
      apr: await (async () => {
        try {
          const apr = await model.calcApr();
          return apr;
        } catch (e) {
          console.log(e);
          return;
        }
      })(),
    };
  }

  static wrap(data: Pool, repositories: BalancerDataRepositories): PoolModel {
    return {
      ...data,
      calcLiquidity: async function () {
        const liquidityService = new Liquidity(
          repositories.pools,
          repositories.tokenPrices
        );

        return liquidityService.getLiquidity(this);
      },
      calcApr: async function () {
        const aprService = new PoolApr(
          data,
          repositories.tokenPrices,
          repositories.tokenMeta,
          repositories.pools,
          repositories.yesterdaysPools,
          repositories.liquidityGauges,
          repositories.feeDistributor,
          repositories.feeCollector,
          repositories.tokenYields
        );

        return aprService.apr();
      },
      calcFees: async function () {
        const feeService = new PoolFees(data, repositories.yesterdaysPools);

        return feeService.last24h();
      },
      calcVolume: async function () {
        const volumeService = new PoolVolume(
          data,
          repositories.yesterdaysPools
        );

        return volumeService.last24h();
      },
      // TODO: spotPrice fails, because it needs a subgraphType,
      // either we refetch or it needs a type transformation from SDK internal to SOR (subgraph)
      // spotPrice: async (tokenIn: string, tokenOut: string) =>
      //   methods.spotPriceCalculator.calcPoolSpotPrice(tokenIn, tokenOut, data),
    };
  }

  async find(id: string): Promise<Pool | undefined> {
    const data = await this.repositories.pools.find(id);
    if (!data) return;

    const model = ModelProvider.wrap(data, this.repositories);

    return await ModelProvider.resolve(model);
  }

  async findBy(param: string, value: string): Promise<Pool | undefined> {
    if (param == 'id') {
      return this.find(value);
    } else if (param == 'address') {
      const data = await this.repositories.pools.findBy('address', value);
      if (!data) return;

      const model = ModelProvider.wrap(data, this.repositories);

      return await ModelProvider.resolve(model);
    } else {
      throw `search by ${param} not implemented`;
    }
  }

  async all(page = 1): Promise<Pool[]> {
    const list = await this.repositories.pools.all();
    if (!list) return [];

    const slice = list.slice(
      (page - 1) * POOLS_PER_PAGE,
      page * POOLS_PER_PAGE
    );

    const resolved = Promise.all(
      slice.map(async (data) => {
        const model = ModelProvider.wrap(data, this.repositories);
        return await ModelProvider.resolve(model);
      })
    );

    return resolved;
  }

  async where(filter: (pool: Pool) => boolean, page = 1): Promise<Pool[]> {
    const list = await this.repositories.pools.where(filter);
    if (!list) return [];

    const slice = list.slice(
      (page - 1) * POOLS_PER_PAGE,
      page * POOLS_PER_PAGE
    );

    const resolved = Promise.all(
      slice.map(async (data) => {
        const model = ModelProvider.wrap(data, this.repositories);
        return await ModelProvider.resolve(model);
      })
    );

    return resolved;
  }
}
