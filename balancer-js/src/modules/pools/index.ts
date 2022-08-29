import type {
  BalancerNetworkConfig,
  BalancerDataRepositories,
  Findable,
  Searchable,
  Updatetable,
  Pool,
  PoolWithMethods,
  AprBreakdown,
} from '@/types';
import { JoinPoolAttributes } from './pool-types/concerns/types';
import { PoolTypeConcerns } from './pool-type-concerns';
import { ModelProvider } from './model-provider';
import { PoolApr } from './apr/apr';

/**
 * Controller / use-case layer for interacting with pools data.
 */
export class Pools implements Findable<PoolWithMethods> {
  liveModelProvider: ModelProvider;

  constructor(
    private networkConfig: BalancerNetworkConfig,
    private repositories: BalancerDataRepositories
  ) {
    this.liveModelProvider = new ModelProvider(repositories);
  }

  dataSource(): Findable<Pool> & Searchable<Pool> & Updatetable<Pool> {
    // TODO: Add API data repository to data and use liveModelProvider as fallback
    return this.liveModelProvider;
  }

  /**
   * Calculates APR on any pool data
   *
   * @param pool
   * @returns
   */
  async apr(pool: Pool): Promise<AprBreakdown> {
    const aprService = new PoolApr(
      pool,
      this.repositories.tokenPrices,
      this.repositories.tokenMeta,
      this.repositories.pools,
      this.repositories.yesterdaysPools,
      this.repositories.liquidityGauges,
      this.repositories.feeDistributor,
      this.repositories.feeCollector,
      this.repositories.tokenYields
    );

    return aprService.apr();
  }

  static wrap(
    pool: Pool,
    dataSource: Updatetable<Pool>,
    networkConfig: BalancerNetworkConfig
  ): PoolWithMethods {
    const methods = PoolTypeConcerns.from(pool.poolType);
    return {
      ...pool,
      // // NOTE: 🚨🚨🚨 - this is wrong
      // // Temporary way to update pool values upstream before downstream data cycle get's implemented
      update: async (id: string): Promise<PoolWithMethods | undefined> => {
        const pool = await dataSource.update(id);
        if (pool) {
          return Pools.wrap(pool, dataSource, networkConfig);
        } else {
          return undefined;
        }
      },
      buildJoin: (
        joiner: string,
        tokensIn: string[],
        amountsIn: string[],
        slippage: string
      ): JoinPoolAttributes => {
        return methods.join.buildJoin({
          joiner,
          pool,
          tokensIn,
          amountsIn,
          slippage,
          wrappedNativeAsset: networkConfig.addresses.tokens.wrappedNativeAsset,
        });
      },
      calcPriceImpact: async (amountsIn: string[], minBPTOut: string) =>
        methods.priceImpactCalculator.calcPriceImpact(
          pool,
          amountsIn,
          minBPTOut
        ),
      buildExitExactBPTIn: (
        exiter,
        bptIn,
        slippage,
        shouldUnwrapNativeAsset = false,
        singleTokenMaxOut
      ) =>
        methods.exit.buildExitExactBPTIn({
          exiter,
          pool,
          bptIn,
          slippage,
          shouldUnwrapNativeAsset,
          wrappedNativeAsset: networkConfig.addresses.tokens.wrappedNativeAsset,
          singleTokenMaxOut,
        }),
      buildExitExactTokensOut: (exiter, tokensOut, amountsOut, slippage) =>
        methods.exit.buildExitExactTokensOut({
          exiter,
          pool,
          tokensOut,
          amountsOut,
          slippage,
          wrappedNativeAsset: networkConfig.addresses.tokens.wrappedNativeAsset,
        }),
      // TODO: spotPrice fails, because it needs a subgraphType,
      // either we refetch or it needs a type transformation from SDK internal to SOR (subgraph)
      // spotPrice: async (tokenIn: string, tokenOut: string) =>
      //   methods.spotPriceCalculator.calcPoolSpotPrice(tokenIn, tokenOut, data),
    };
  }

  async find(id: string): Promise<PoolWithMethods | undefined> {
    const data = await this.dataSource().find(id);
    if (!data) return;

    return Pools.wrap(data, this.dataSource(), this.networkConfig);
  }

  async findBy(
    param: string,
    value: string
  ): Promise<PoolWithMethods | undefined> {
    if (param == 'id') {
      return this.find(value);
    } else if (param == 'address') {
      const data = await this.dataSource().findBy('address', value);
      if (!data) return;

      return Pools.wrap(data, this.dataSource(), this.networkConfig);
    } else {
      throw `search by ${param} not implemented`;
    }
  }

  async all(): Promise<PoolWithMethods[]> {
    const list = await this.dataSource().all();
    if (!list) return [];

    return list.map((data: Pool) =>
      Pools.wrap(data, this.dataSource(), this.networkConfig)
    );
  }

  async where(filter: (pool: Pool) => boolean): Promise<PoolWithMethods[]> {
    const list = await this.dataSource().where(filter);
    if (!list) return [];

    return list.map((data: Pool) =>
      Pools.wrap(data, this.dataSource(), this.networkConfig)
    );
  }
}
