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
import { JsonRpcSigner } from '@ethersproject/providers';
import { Exit } from '../exits/exits.module';

/**
 * Controller / use-case layer for interacting with pools data.
 */
export class Pools implements Findable<PoolWithMethods> {
  aprService;
  liquidityService;
  joinService;
  exitService;

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
    this.joinService = new Join(this.repositories.pools, networkConfig.chainId);
    this.exitService = new Exit(this.repositories.pools, networkConfig.chainId);
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
   * Builds generalised join transaction
   *
   * @param poolId          Pool id
   * @param tokens          Token addresses
   * @param amounts         Token amounts in EVM scale
   * @param userAddress     User address
   * @param wrapMainTokens  Indicates whether main tokens should be wrapped before being used
   * @param slippage        Maximum slippage tolerance in bps i.e. 50 = 0.5%.
   * @param signer          Signer (used for simulating tx to get accurate amounts)
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
    signer: JsonRpcSigner,
    authorisation?: string
  ): Promise<{
    to: string;
    callData: string;
    minOut: string;
    expectedOut: string;
  }> {
    return this.joinService.joinPool(
      poolId,
      tokens,
      amounts,
      userAddress,
      wrapMainTokens,
      slippage,
      signer,
      authorisation
    );
  }

  /**
   * Builds generalised join transaction
   *
   * @param poolId          Pool id
   * @param amount         Token amount in EVM scale
   * @param userAddress     User address
   * @param authorisation   Optional auhtorisation call to be added to the chained transaction
   * @returns transaction data ready to be sent to the network along with tokens, min and expected BPT amounts out.
   */
  async generalisedExit(
    poolId: string,
    amount: string,
    userAddress: string,
    signer: JsonRpcSigner,
    slippage: string,
    authorisation?: string
  ): Promise<{
    to: string;
    callData: string;
    tokensOut: string[];
    expectedAmountsOut: string[];
    minAmountsOut: string[];
  }> {
    return this.exitService.exitPool(
      poolId,
      amount,
      userAddress,
      signer,
      slippage,
      authorisation
    );
  }

  static wrap(
    pool: Pool,
    networkConfig: BalancerNetworkConfig
  ): PoolWithMethods {
    const methods = PoolTypeConcerns.from(pool.poolType);
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
