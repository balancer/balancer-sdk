import { BigNumberish } from '@ethersproject/bignumber';
import { JsonRpcSigner } from '@ethersproject/providers';

import { BalancerError } from '@/balancerErrors';
import { Contracts } from '@/modules/contracts/contracts.module';
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
import { Logger } from '@/lib/utils/logger';

import {
  ExitExactBPTInAttributes,
  JoinPoolAttributes,
} from './pool-types/concerns/types';
import { PoolTypeConcerns } from './pool-type-concerns';
import { PoolApr } from './apr/apr';
import { Liquidity } from '../liquidity/liquidity.module';
import { Join } from '../joins/joins.module';
import { Exit, GeneralisedExitOutput, ExitInfo } from '../exits/exits.module';
import { PoolVolume } from './volume/volume';
import { PoolFees } from './fees/fees';
import { Simulation, SimulationType } from '../simulation/simulation.module';
import { PoolGraph } from '../graph/graph';
import { PoolFactory__factory } from './pool-factory__factory';
import * as Queries from './queries';
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
  simulationService;
  poolFactory;
  impermanentLossService;
  graphService;
  emissionsService;
  proportionalAmounts;

  constructor(
    private networkConfig: BalancerNetworkConfig,
    private repositories: BalancerDataRepositories,
    private balancerContracts: Contracts
  ) {
    this.aprService = new PoolApr(
      this.repositories.pools,
      this.repositories.tokenPrices,
      this.repositories.tokenMeta,
      this.repositories.tokenYields,
      this.repositories.feeCollector,
      this.repositories.yesterdaysPools,
      this.repositories.liquidityGauges,
      this.repositories.feeDistributor,
      this.repositories.gyroConfigRepository
    );
    this.liquidityService = new Liquidity(
      repositories.pools,
      repositories.tokenPrices
    );
    this.simulationService = new Simulation(
      networkConfig,
      this.repositories.poolsForSimulations
    );
    this.graphService = new PoolGraph(this.repositories.poolsOnChain);
    this.joinService = new Join(
      this.graphService,
      networkConfig,
      this.simulationService
    );
    this.exitService = new Exit(
      this.graphService,
      networkConfig,
      this.simulationService
    );
    this.feesService = new PoolFees(repositories.yesterdaysPools);
    this.volumeService = new PoolVolume(repositories.yesterdaysPools);
    this.poolFactory = new PoolFactory__factory(
      networkConfig,
      balancerContracts
    );
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
          tokenAmounts: string[],
          bptAmount: string,
          isJoin: boolean
        ) =>
          concerns.priceImpactCalculator.calcPriceImpact(
            pool,
            tokenAmounts.map(BigInt),
            BigInt(bptAmount),
            isJoin
          ),
        buildExitExactBPTIn: (
          exiter: string,
          bptIn: string,
          slippage: string,
          shouldUnwrapNativeAsset = false,
          singleTokenOut?: string,
          toInternalBalance = false
        ) => {
          if (concerns.exit.buildExitExactBPTIn) {
            return concerns.exit.buildExitExactBPTIn({
              exiter,
              pool,
              bptIn,
              slippage,
              shouldUnwrapNativeAsset,
              wrappedNativeAsset,
              singleTokenOut,
              toInternalBalance,
            });
          } else {
            throw 'ExitExactBPTIn not supported';
          }
        },
        buildExitExactTokensOut: (
          exiter: string,
          tokensOut: string[],
          amountsOut: string[],
          slippage: string,
          toInternalBalance = false
        ) =>
          concerns.exit.buildExitExactTokensOut({
            exiter,
            pool,
            tokensOut,
            amountsOut,
            slippage,
            wrappedNativeAsset,
            toInternalBalance,
          }),
        buildRecoveryExit: (
          exiter: string,
          bptIn: string,
          slippage: string,
          toInternalBalance = false
        ) =>
          concerns.exit.buildRecoveryExit({
            exiter,
            pool,
            bptIn,
            slippage,
            toInternalBalance,
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
        const logger = Logger.getInstance();
        logger.warn(error as string);
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
        buildRecoveryExit: notImplemented(pool.poolType, 'buildRecoveryExit'),
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
    const bptIndex = pool.tokensList.indexOf(pool.address);
    return {
      ...pool,
      ...methods,
      bptIndex,
    };
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
   * Calculates total pool liquidity in USD
   *
   * @param pool
   * @returns total pool liquidity in USD
   */
  async liquidity(pool: Pool): Promise<string> {
    return this.liquidityService.getLiquidity(pool);
  }

  /**
   * Calculates pool's BPT price in USD
   *
   * @param pool
   * @returns pool's BPT price in USD
   */
  async bptPrice(pool: Pool): Promise<string> {
    return this.liquidityService.getBptPrice(pool);
  }

  /**
   * Builds join transaction
   *
   * @param pool            Pool
   * @param tokensIn        Token addresses
   * @param amountsIn       Token amounts in EVM scale
   * @param userAddress     User address
   * @param slippage        Maximum slippage tolerance in bps i.e. 50 = 0.5%.
   * @returns               Transaction object
   * @throws                Error if pool type is not implemented
   */
  buildJoin({
    pool,
    tokensIn,
    amountsIn,
    userAddress,
    slippage,
  }: {
    pool: Pool;
    tokensIn: string[];
    amountsIn: string[];
    userAddress: string;
    slippage: string;
  }): JoinPoolAttributes {
    const concerns = PoolTypeConcerns.from(pool.poolType);

    if (!concerns)
      throw `buildJoin for poolType ${pool.poolType} not implemented`;

    return concerns.join.buildJoin({
      joiner: userAddress,
      pool,
      tokensIn,
      amountsIn,
      slippage,
      wrappedNativeAsset:
        this.networkConfig.addresses.tokens.wrappedNativeAsset.toLowerCase(),
    });
  }

  buildExitExactBPTIn({
    pool,
    bptAmount,
    userAddress,
    slippage,
    shouldUnwrapNativeAsset,
    singleTokenOut,
  }: {
    pool: Pool;
    bptAmount: string;
    userAddress: string;
    slippage: string;
    shouldUnwrapNativeAsset?: boolean;
    singleTokenOut?: string;
  }): ExitExactBPTInAttributes {
    const concerns = PoolTypeConcerns.from(pool.poolType);
    if (!concerns || !concerns.exit.buildExitExactBPTIn)
      throw `buildExit for poolType ${pool.poolType} not implemented`;

    return concerns.exit.buildExitExactBPTIn({
      pool,
      exiter: userAddress,
      bptIn: bptAmount,
      slippage,
      wrappedNativeAsset:
        this.networkConfig.addresses.tokens.wrappedNativeAsset.toLowerCase(),
      shouldUnwrapNativeAsset: shouldUnwrapNativeAsset ?? false,
      singleTokenOut: singleTokenOut ?? undefined,
      toInternalBalance: false,
    });
  }

  buildRecoveryExit({
    pool,
    bptAmount,
    userAddress,
    slippage,
    toInternalBalance,
  }: {
    pool: Pool;
    bptAmount: string;
    userAddress: string;
    slippage: string;
    toInternalBalance?: boolean;
  }): ExitExactBPTInAttributes {
    const concerns = PoolTypeConcerns.from(pool.poolType);
    if (!concerns || !concerns.exit.buildRecoveryExit)
      throw `buildRecoveryExit for poolType ${pool.poolType} not implemented`;

    return concerns.exit.buildRecoveryExit({
      exiter: userAddress,
      pool,
      bptIn: bptAmount,
      slippage,
      toInternalBalance: !!toInternalBalance,
    });
  }

  /**
   * Builds generalised join transaction
   *
   * @param poolId          Pool id
   * @param tokens          Token addresses
   * @param amounts         Token amounts in EVM scale
   * @param userAddress     User address
   * @param slippage        Maximum slippage tolerance in bps i.e. 50 = 0.5%.
   * @param signer          JsonRpcSigner that will sign the staticCall transaction if Static simulation chosen
   * @param simulationType  Simulation type (VaultModel, Tenderly or Static)
   * @param authorisation   Optional auhtorisation call to be added to the chained transaction
   * @returns transaction data ready to be sent to the network along with min and expected BPT amounts out.
   */
  async generalisedJoin(
    poolId: string,
    tokens: string[],
    amounts: string[],
    userAddress: string,
    slippage: string,
    signer: JsonRpcSigner,
    simulationType: SimulationType,
    authorisation?: string
  ): Promise<{
    to: string;
    encodedCall: string;
    minOut: string;
    expectedOut: string;
    priceImpact: string;
    value: BigNumberish;
  }> {
    return this.joinService.joinPool(
      poolId,
      tokens,
      amounts,
      userAddress,
      slippage,
      signer,
      simulationType,
      authorisation
    );
  }

  /**
   * Builds generalised exit transaction
   *
   * @param poolId          Pool id
   * @param amount          Token amount in EVM scale
   * @param userAddress     User address
   * @param slippage        Maximum slippage tolerance in bps i.e. 50 = 0.5%.
   * @param signer          JsonRpcSigner that will sign the staticCall transaction if Static simulation chosen
   * @param simulationType  Simulation type (Tenderly or Static) - VaultModel should not be used to build exit transaction
   * @param authorisation   Optional auhtorisation call to be added to the chained transaction
   * @param tokensToUnwrap  List all tokens that requires exit by unwrapping - info provided by getExitInfo
   * @returns transaction data ready to be sent to the network along with tokens, min and expected amounts out.
   */
  async generalisedExit(
    poolId: string,
    amount: string,
    userAddress: string,
    slippage: string,
    signer: JsonRpcSigner,
    simulationType: SimulationType.Static | SimulationType.Tenderly,
    authorisation?: string,
    tokensToUnwrap?: string[]
  ): Promise<GeneralisedExitOutput> {
    return this.exitService.buildExitCall(
      poolId,
      amount,
      userAddress,
      slippage,
      signer,
      simulationType,
      authorisation,
      tokensToUnwrap
    );
  }

  /**
   * Calculates price impact for an action on a pool
   *
   * @param pool
   * @returns percentage as a string in EVM scale
   */
  calcPriceImpact({
    pool,
    tokenAmounts,
    bptAmount,
    isJoin,
  }: {
    pool: Pool;
    tokenAmounts: string[];
    bptAmount: string;
    isJoin: boolean;
  }): string {
    const concerns = PoolTypeConcerns.from(pool.poolType);
    return concerns.priceImpactCalculator.calcPriceImpact(
      pool,
      tokenAmounts.map(BigInt),
      BigInt(bptAmount),
      isJoin
    );
  }

  /**
   * Gets info required to build generalised exit transaction
   *
   * @param poolId          Pool id
   * @param amountBptIn     BPT amount in EVM scale
   * @param userAddress     User address
   * @param signer          JsonRpcSigner that will sign the staticCall transaction if Static simulation chosen
   * @returns info required to build a generalised exit transaction including whether tokens need to be unwrapped
   */
  async getExitInfo(
    poolId: string,
    amountBptIn: string,
    userAddress: string,
    signer: JsonRpcSigner
  ): Promise<ExitInfo> {
    return this.exitService.getExitInfo(
      poolId,
      amountBptIn,
      userAddress,
      signer
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
