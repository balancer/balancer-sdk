import { BigNumber, formatFixed } from '@ethersproject/bignumber';
import { Provider } from '@ethersproject/providers';
import { PoolDataQueryConfigStruct } from '@/contracts/BalancerPoolDataQueries';
import { BalancerPoolDataQueries__factory } from '@/contracts';
import { Tokens, BalancerPool } from './onChainData';

enum PoolQuerySwapFeeType {
  SWAP_FEE_PERCENTAGE = 0,
  PERCENT_FEE,
}

enum PoolQueriesTotalSupplyType {
  TOTAL_SUPPLY = 0,
  VIRTUAL_SUPPLY,
  ACTUAL_SUPPLY,
}

interface QueryResult {
  balances: BigNumber[][];
  totalSupplies: BigNumber[];
  swapFees: BigNumber[];
  linearWrappedTokenRates: BigNumber[];
  linearTargets: BigNumber[][];
  weights: BigNumber[][];
  scalingFactors: BigNumber[][];
  amps: BigNumber[];
  rates: BigNumber[];
  ignoreIdxs: BigNumber[];
}

export async function getPoolsFromDataQuery<GenericPool extends BalancerPool>(
  pools: GenericPool[],
  dataQueryAddr: string,
  provider: Provider
): Promise<GenericPool[]> {
  const poolDataQueryConfig = getPoolDataQueryConfig(pools);

  const queryContract = BalancerPoolDataQueries__factory.connect(
    dataQueryAddr,
    provider
  );
  const queryResult = await queryContract.getPoolData(
    poolDataQueryConfig.poolIds,
    poolDataQueryConfig
  );
  return mapQueryResultToPools({
    pools: pools,
    queryResult,
    ampPoolIdxs: poolDataQueryConfig.ampPoolIdxs,
    weightedPoolIdxs: poolDataQueryConfig.weightedPoolIdxs,
    linearPoolIdxs: poolDataQueryConfig.linearPoolIdxs,
    scalingFactorPoolIdxs: poolDataQueryConfig.scalingFactorPoolIdxs,
  });
}

function getPoolDataQueryConfig<GenericPool extends BalancerPool>(
  pools: GenericPool[]
): PoolDataQueryConfigStruct & { poolIds: string[] } {
  const poolIds = pools.map((p) => p.id);
  const weightedPoolIdxs: number[] = [];
  const linearPoolIdxs: number[] = [];
  const ampPoolIdxs: number[] = [];
  // scaling factors are used to find token rates
  const scalingFactorPoolIdxs: number[] = [];
  // ratePools call .getRate() on pool
  // const ratePoolIdexes: number[] = [];

  for (const pool of pools) {
    switch (pool.poolType) {
      case 'LiquidityBootstrapping':
      case 'Investment':
      case 'Weighted':
        weightedPoolIdxs.push(poolIds.findIndex((id) => id === pool.id));
        break;
      case 'Stable':
        ampPoolIdxs.push(poolIds.findIndex((id) => id === pool.id));
        break;
      case 'StablePhantom':
      case 'MetaStable':
      case 'ComposableStable':
        ampPoolIdxs.push(poolIds.findIndex((id) => id === pool.id));
        // ratePoolIdexes.push(poolIds.findIndex((id) => id === pool.id));
        scalingFactorPoolIdxs.push(poolIds.findIndex((id) => id === pool.id));
        break;
      default:
        //Handling all Linear pools
        if (pool.poolType.includes('Linear')) {
          linearPoolIdxs.push(poolIds.findIndex((id) => id === pool.id));
          // ratePoolIdexes.push(poolIds.findIndex((id) => id === pool.id));
          scalingFactorPoolIdxs.push(poolIds.findIndex((id) => id === pool.id));
        }
        break;
    }
  }

  return {
    poolIds,
    loadTokenBalanceUpdatesAfterBlock: true,
    blockNumber: 0, // always get balances from all pools
    loadAmps: ampPoolIdxs.length > 0,
    ampPoolIdxs,
    loadSwapFees: true,
    swapFeeTypes: Array(poolIds.length).fill(
      PoolQuerySwapFeeType.SWAP_FEE_PERCENTAGE
    ),
    loadTotalSupply: true,
    totalSupplyTypes: supplyTypes(pools),
    loadNormalizedWeights: weightedPoolIdxs.length > 0,
    weightedPoolIdxs,
    loadLinearTargets: true,
    loadLinearWrappedTokenRates: linearPoolIdxs.length > 0,
    linearPoolIdxs,
    loadRates: false, // We haven't been loading pool rate from onchain previously as not used in SOR
    ratePoolIdxs: [],
    loadScalingFactors: scalingFactorPoolIdxs.length > 0,
    scalingFactorPoolIdxs,
  };
}

/**
 * Map EVM values to Human scale pool.
 * @param input
 * @returns Array of pools with human scale values.
 */
function mapQueryResultToPools<GenericPool extends BalancerPool>(
  input: Pick<
    PoolDataQueryConfigStruct,
    | 'ampPoolIdxs'
    | 'weightedPoolIdxs'
    | 'linearPoolIdxs'
    | 'scalingFactorPoolIdxs'
  > & {
    pools: GenericPool[];
    queryResult: QueryResult;
  }
): GenericPool[] {
  const {
    pools,
    ampPoolIdxs,
    weightedPoolIdxs,
    linearPoolIdxs,
    scalingFactorPoolIdxs,
    queryResult,
  } = input;
  const mappedPools = pools.map((pool, i) => {
    if (queryResult.ignoreIdxs.some((index) => index.eq(i))) {
      console.log('Ignoring: ', pool.id); // TODO - Should we remove these pools?
      return pool;
    }
    const tokens = mapPoolTokens({
      pool,
      poolIndex: i,
      scalingFactorPoolIdxs,
      weightedPoolIdxs,
      linearPoolIdxs,
      queryResult,
    });
    const isLinear = pool.poolType.includes('Linear');
    return {
      ...pool,
      lowerTarget: isLinear
        ? formatFixed(
            queryResult.linearTargets[linearPoolIdxs.indexOf(i)][0],
            18
          )
        : '0',
      upperTarget: isLinear
        ? formatFixed(
            queryResult.linearTargets[linearPoolIdxs.indexOf(i)][1],
            18
          )
        : '0',
      tokens,
      swapFee: formatFixed(queryResult.swapFees[i], 18),
      // Need to scale amp by precision to match expected Subgraph scale
      // amp is stored with 3 decimals of precision
      amp: ampPoolIdxs.includes(i)
        ? formatFixed(queryResult.amps[ampPoolIdxs.indexOf(i)], 3)
        : undefined,
      totalShares: formatFixed(queryResult.totalSupplies[i], 18),
    };
  });

  return mappedPools;
}

function mapPoolTokens<GenericPool extends BalancerPool>(
  input: Pick<
    PoolDataQueryConfigStruct,
    'weightedPoolIdxs' | 'linearPoolIdxs' | 'scalingFactorPoolIdxs'
  > & { pool: GenericPool; queryResult: QueryResult; poolIndex: number }
): Tokens {
  const {
    pool,
    poolIndex,
    scalingFactorPoolIdxs,
    weightedPoolIdxs,
    linearPoolIdxs,
    queryResult,
  } = input;
  const tokens = [...pool.tokens];
  updateTokens({
    tokens,
    queryResult,
    poolIndex,
    scalingFactorPoolIdxs,
    weightedPoolIdxs,
  });

  if (pool.poolType.includes('Linear'))
    updateLinearWrapped({
      tokens,
      queryResult,
      poolIndex,
      wrappedIndex: pool.wrappedIndex,
      linearPoolIdxs,
    });
  return tokens;
}

function updateTokens(
  input: Pick<
    PoolDataQueryConfigStruct,
    'weightedPoolIdxs' | 'scalingFactorPoolIdxs'
  > & {
    tokens: Tokens;
    queryResult: QueryResult;
    poolIndex: number;
  }
): void {
  const {
    tokens,
    queryResult,
    scalingFactorPoolIdxs,
    weightedPoolIdxs,
    poolIndex,
  } = input;
  const sfIndex = scalingFactorPoolIdxs.indexOf(poolIndex);
  const wIndex = weightedPoolIdxs.indexOf(poolIndex);
  tokens.forEach((t, tokenIndex) => {
    t.balance = formatFixed(
      queryResult.balances[poolIndex][tokenIndex],
      t.decimals
    );
    t.weight =
      wIndex !== -1
        ? formatFixed(queryResult.weights[wIndex][tokenIndex], 18)
        : null;
    if (sfIndex !== -1) {
      t.priceRate = formatFixed(
        queryResult.scalingFactors[sfIndex][tokenIndex]
          .mul(BigNumber.from('10').pow(t.decimals || 18))
          .div(`1000000000000000000`),
        18
      );
    }
  });
}

function updateLinearWrapped(
  input: Pick<PoolDataQueryConfigStruct, 'linearPoolIdxs'> & {
    tokens: Tokens;
    queryResult: QueryResult;
    poolIndex: number;
    wrappedIndex: number | undefined;
  }
): void {
  const { tokens, queryResult, linearPoolIdxs, poolIndex, wrappedIndex } =
    input;
  if (wrappedIndex === undefined) {
    throw Error(`Linear Pool Missing WrappedIndex or PriceRate`);
  }
  const wrappedIndexResult = linearPoolIdxs.indexOf(poolIndex);
  const rate =
    wrappedIndexResult === -1
      ? '1.0'
      : formatFixed(
          queryResult.linearWrappedTokenRates[wrappedIndexResult],
          18
        );
  tokens[wrappedIndex].priceRate = rate;
}

function supplyTypes<GenericPool extends BalancerPool>(
  pools: GenericPool[]
): PoolQueriesTotalSupplyType[] {
  return pools.map((pool) => {
    if (
      pool.poolType === 'ComposableStable' ||
      (pool.poolType === 'Weighted' &&
        pool.poolTypeVersion &&
        pool.poolTypeVersion > 1)
    ) {
      return PoolQueriesTotalSupplyType.ACTUAL_SUPPLY;
    } else if (
      pool.poolType.includes('Linear') ||
      pool.poolType === 'StablePhantom'
    ) {
      return PoolQueriesTotalSupplyType.VIRTUAL_SUPPLY;
    } else {
      return PoolQueriesTotalSupplyType.TOTAL_SUPPLY;
    }
  });
}
