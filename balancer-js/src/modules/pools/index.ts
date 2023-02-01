import { ImpermanentLossService } from '@/modules/pools/impermanentLoss/impermanentLossService';
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
import { Join } from '../joins/joins.module';
import { Exit } from '../exits/exits.module';
import { PoolVolume } from './volume/volume';
import { PoolFees } from './fees/fees';
import { PoolFactory__factory } from './pool-factory__factory';
import * as Queries from './queries';
import { BalancerError } from '@/balancerErrors';
import { EmissionsService } from './emissions';
import { proportionalAmounts } from './proportional-amounts';

const notImplemented = (poolType: string, name: string) => () => {
  throw `${name} for poolType ${poolType} not implemented`;
};

/**
 * Controller / use-case layer for interacting with pools data.
 */
export class Pools implements Findable<PoolWithMethods> {
  aprService;
  liquidityService;
  joinService;
  exitService;
  feesService;
  volumeService;
  poolFactory;
  impermanentLossService;
  emissionsService;
  proportionalAmounts;

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
    this.joinService = new Join(this.repositories.poolsOnChain, networkConfig);
    this.exitService = new Exit(this.repositories.poolsOnChain, networkConfig);
    this.feesService = new PoolFees(repositories.yesterdaysPools);
    this.volumeService = new PoolVolume(repositories.yesterdaysPools);
    this.poolFactory = new PoolFactory__factory(networkConfig);
    this.impermanentLossService = new ImpermanentLossService(
      repositories.tokenPrices,
      repositories.tokenHistoricalPrices
    );
    if (repositories.liquidityGauges) {
      this.emissionsService = new EmissionsService(
        repositories.liquidityGauges
      );
    }
    this.proportionalAmounts = proportionalAmounts;
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
   * Calculates Impermanent Loss on any pool data
   *
   * @param timestamp
   * @param pool
   * @returns
   */
  async impermanentLoss(timestamp: number, pool: Pool): Promise<number> {
    return this.impermanentLossService.calcImpLoss(timestamp, pool);
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
   * Builds generalised join transaction
   *
   * @param poolId          Pool id
   * @param tokens          Token addresses
   * @param amounts         Token amounts in EVM scale
   * @param userAddress     User address
   * @param wrapMainTokens  Indicates whether main tokens should be wrapped before being used
   * @param slippage        Maximum slippage tolerance in bps i.e. 50 = 0.5%.
   * @param authorisation   Optional auhtorisation call to be added to the chained transaction
   * @returns transaction data ready to be sent to the network along with min and expected BPT amounts out.
   */
  async generalisedJoin(
    poolId: string,
    tokens: string[],
    amounts: string[],
    userAddress: string,
    wrapMainTokens: boolean,
    slippage: string,
    authorisation?: string
  ): Promise<{
    to: string;
    callData: string;
    minOut: string;
    expectedOut: string;
    priceImpact: string;
  }> {
    return this.joinService.joinPool(
      poolId,
      tokens,
      amounts,
      userAddress,
      wrapMainTokens,
      slippage,
      authorisation
    );
  }

  /**
   * Builds generalised exit transaction
   *
   * @param poolId        Pool id
   * @param amount        Token amount in EVM scale
   * @param userAddress   User address
   * @param slippage      Maximum slippage tolerance in bps i.e. 50 = 0.5%.
   * @param authorisation Optional auhtorisation call to be added to the chained transaction
   * @returns transaction data ready to be sent to the network along with tokens, min and expected amounts out.
   */
  async generalisedExit(
    poolId: string,
    amount: string,
    userAddress: string,
    slippage: string,
    authorisation?: string
  ): Promise<{
    to: string;
    callData: string;
    tokensOut: string[];
    expectedAmountsOut: string[];
    minAmountsOut: string[];
    priceImpact: string;
  }> {
    return this.exitService.exitPool(
      poolId,
      amount,
      userAddress,
      slippage,
      authorisation
    );
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
    let concerns: ReturnType<typeof PoolTypeConcerns.from>;
    let queries: Queries.ParamsBuilder;
    let methods;
    try {
      concerns = PoolTypeConcerns.from(pool.poolType);
      methods = {
        buildJoin: (
          joiner: string,
          tokensIn: string[],
          amountsIn: string[],
          slippage: string
        ): JoinPoolAttributes => {
          return concerns.join.buildJoin({
            joiner,
            pool,
            tokensIn,
            amountsIn,
            slippage,
            wrappedNativeAsset,
          });
        },
        calcPriceImpact: async (
          amountsIn: string[],
          minBPTOut: string,
          isJoin: boolean
        ) =>
          concerns.priceImpactCalculator.calcPriceImpact(
            pool,
            amountsIn,
            minBPTOut,
            isJoin
          ),
        buildExitExactBPTIn: (
          exiter: string,
          bptIn: string,
          slippage: string,
          shouldUnwrapNativeAsset = false,
          singleTokenMaxOut?: string
        ) => {
          if (concerns.exit.buildExitExactBPTIn) {
            return concerns.exit.buildExitExactBPTIn({
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
        buildExitExactTokensOut: (
          exiter: string,
          tokensOut: string[],
          amountsOut: string[],
          slippage: string
        ) =>
          concerns.exit.buildExitExactTokensOut({
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
          concerns.spotPriceCalculator.calcPoolSpotPrice(
            tokenIn,
            tokenOut,
            pool
          ),
        calcProportionalAmounts: (token: string, amount: string) => {
          return proportionalAmounts(pool, token, amount);
        },
      };
    } catch (error) {
      if ((error as BalancerError).code != 'UNSUPPORTED_POOL_TYPE') {
        console.error(error);
      }

      methods = {
        buildJoin: notImplemented(pool.poolType, 'buildJoin'),
        calcPriceImpact: notImplemented(pool.poolType, 'calcPriceImpact'),
        buildExitExactBPTIn: notImplemented(
          pool.poolType,
          'buildExitExactBPTIn'
        ),
        buildExitExactTokensOut: notImplemented(
          pool.poolType,
          'buildExitExactTokensOut'
        ),
        calcSpotPrice: notImplemented(pool.poolType, 'calcSpotPrice'),
      };
    }

    try {
      queries = new Queries.ParamsBuilder(pool);
      methods = {
        ...methods,
        buildQueryJoinExactIn: queries.buildQueryJoinExactIn.bind(queries),
        buildQueryJoinExactOut: queries.buildQueryJoinExactOut.bind(queries),
        buildQueryExitExactOut: queries.buildQueryExitExactOut.bind(queries),
        buildQueryExitToSingleToken:
          queries.buildQueryExitToSingleToken.bind(queries),
        buildQueryExitProportionally:
          queries.buildQueryExitProportionally.bind(queries),
      };
    } catch (error) {
      methods = {
        ...methods,
        buildQueryJoinExactIn: notImplemented(
          pool.poolType,
          'buildQueryJoinExactIn'
        ),
        buildQueryJoinExactOut: notImplemented(
          pool.poolType,
          'buildQueryJoinExactOut'
        ),
        buildQueryExitExactOut: notImplemented(
          pool.poolType,
          'buildQueryExitExactOut'
        ),
        buildQueryExitToSingleToken: notImplemented(
          pool.poolType,
          'buildQueryExitToSingleToken'
        ),
        buildQueryExitProportionally: notImplemented(
          pool.poolType,
          'buildQueryExitProportionally'
        ),
      };
    }
    const wrappedNativeAsset =
      networkConfig.addresses.tokens.wrappedNativeAsset.toLowerCase();
    return {
      ...pool,
      ...methods,
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

    return list
      .map((data: Pool) => Pools.wrap(data, this.networkConfig))
      .filter((p) => p) as PoolWithMethods[];
  }

  async where(filter: (pool: Pool) => boolean): Promise<PoolWithMethods[]> {
    const list = await this.dataSource().where(filter);
    if (!list) return [];

    const wrapped = list.map((data: Pool) =>
      Pools.wrap(data, this.networkConfig)
    );

    return wrapped.filter((p) => p) as PoolWithMethods[];
  }
}
