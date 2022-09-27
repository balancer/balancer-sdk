import type {
  BalancerNetworkConfig,
  BalancerDataRepositories,
  Findable,
  Searchable,
  Pool,
  PoolWithMethods,
  AprBreakdown,
  PoolAttribute,
} from '@/types';
import { JoinPoolAttributes } from './pool-types/concerns/types';
import { PoolTypeConcerns } from './pool-type-concerns';
import { PoolApr } from './apr/apr';
import { Liquidity } from '../liquidity/liquidity.module';
import { PoolVolume } from './volume/volume';
import { PoolFees } from './fees/fees';

/**
 * Controller / use-case layer for interacting with pools data.
 */
export class Pools implements Findable<PoolWithMethods> {
  aprService;
  liquidityService;
  feesService;
  volumeService;

  constructor(
    private networkConfig: BalancerNetworkConfig,
    private repositories: BalancerDataRepositories
  ) {
    this.aprService = new PoolApr(
      this.repositories.pools,
      this.repositories.tokenPrices,
      this.repositories.tokenMeta,
      this.repositories.tokenYields,
      this.repositories.feeCollector,
      this.repositories.yesterdaysPools,
      this.repositories.liquidityGauges,
      this.repositories.feeDistributor
    );
    this.liquidityService = new Liquidity(
      repositories.pools,
      repositories.tokenPrices
    );
    this.feesService = new PoolFees(repositories.yesterdaysPools);
    this.volumeService = new PoolVolume(repositories.yesterdaysPools);
  }

  dataSource(): Findable<Pool, PoolAttribute> & Searchable<Pool> {
    // TODO: Add API data repository to data and use liveModelProvider as fallback
    return this.repositories.pools;
  }

  /**
   * Calculates APR on any pool data
   *
   * @param pool
   * @returns
   */
  async apr(pool: Pool): Promise<AprBreakdown> {
    return this.aprService.apr(pool);
  }

  /**
   * Calculates total liquidity of the pool
   *
   * @param pool
   * @returns
   */
  async liquidity(pool: Pool): Promise<string> {
    return this.liquidityService.getLiquidity(pool);
  }

  /**
   * Calculates total fees for the pool in the last 24 hours
   *
   * @param pool
   * @returns
   */
  async fees(pool: Pool): Promise<number> {
    return this.feesService.last24h(pool);
  }

  /**
   * Calculates total volume of the pool in the last 24 hours
   *
   * @param pool
   * @returns
   */
  async volume(pool: Pool): Promise<number> {
    return this.volumeService.last24h(pool);
  }

  static wrap(
    pool: Pool,
    networkConfig: BalancerNetworkConfig
  ): PoolWithMethods {
    const methods = PoolTypeConcerns.from(pool.poolType);
    const wrappedNativeAsset =
      networkConfig.addresses.tokens.wrappedNativeAsset.toLowerCase();
    return {
      ...pool,
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
          wrappedNativeAsset,
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
      ) => {
        if (methods.exit.buildExitExactBPTIn) {
          return methods.exit.buildExitExactBPTIn({
            exiter,
            pool,
            bptIn,
            slippage,
            shouldUnwrapNativeAsset,
            wrappedNativeAsset,
            singleTokenMaxOut,
          });
        } else {
          throw 'ExitExactBPTIn not supported';
        }
      },
      buildExitExactTokensOut: (exiter, tokensOut, amountsOut, slippage) =>
        methods.exit.buildExitExactTokensOut({
          exiter,
          pool,
          tokensOut,
          amountsOut,
          slippage,
          wrappedNativeAsset,
        }),
      // TODO: spotPrice fails, because it needs a subgraphType,
      // either we refetch or it needs a type transformation from SDK internal to SOR (subgraph)
      // spotPrice: async (tokenIn: string, tokenOut: string) =>
      //   methods.spotPriceCalculator.calcPoolSpotPrice(tokenIn, tokenOut, data),
      calcSpotPrice: (tokenIn: string, tokenOut: string) =>
        methods.spotPriceCalculator.calcPoolSpotPrice(tokenIn, tokenOut, pool),
    };
  }

  async find(id: string): Promise<PoolWithMethods | undefined> {
    const data = await this.dataSource().find(id);
    if (!data) return;

    return Pools.wrap(data, this.networkConfig);
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

      return Pools.wrap(data, this.networkConfig);
    } else {
      throw `search by ${param} not implemented`;
    }
  }

  async all(): Promise<PoolWithMethods[]> {
    const list = await this.dataSource().all();
    if (!list) return [];

    return list.map((data: Pool) => Pools.wrap(data, this.networkConfig));
  }

  async where(filter: (pool: Pool) => boolean): Promise<PoolWithMethods[]> {
    const list = await this.dataSource().where(filter);
    if (!list) return [];

    return list.map((data: Pool) => Pools.wrap(data, this.networkConfig));
  }
}
