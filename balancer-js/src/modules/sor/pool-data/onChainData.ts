import { BigNumber, formatFixed } from '@ethersproject/bignumber';
import { Provider } from '@ethersproject/providers';
import { SubgraphPoolBase, SubgraphToken } from '@balancer-labs/sor';
import { Multicaller } from '@/lib/utils/multiCaller';
import { isSameAddress } from '@/lib/utils';
import { Multicall__factory, Vault__factory } from '@/contracts';
import { Pool, PoolToken, PoolType } from '@/types';

// TODO: decide whether we want to trim these ABIs down to the relevant functions
import {
  ComposableStablePool__factory,
  ConvergentCurvePool__factory,
  LinearPool__factory,
  StablePool__factory,
  StaticATokenRateProvider__factory,
  WeightedPool__factory,
  GyroEV2__factory,
  BalancerPoolDataQueries__factory,
} from '@/contracts';
import { PoolDataQueryConfigStruct } from '@/contracts/BalancerPoolDataQueries';
import { JsonFragment } from '@ethersproject/abi';

type Tokens = (SubgraphToken | PoolToken)[];

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

type TokenRates = Record<
  string,
  {
    tokenRates?: string[];
  }
>;

export async function getOnChainBalancesNew<
  GenericPool extends Omit<SubgraphPoolBase | Pool, 'tokens'> & {
    tokens: Tokens;
  }
>(
  subgraphPoolsOriginal: GenericPool[],
  dataQueryAddr: string,
  multicallAddr: string,
  provider: Provider
): Promise<GenericPool[]> {
  if (subgraphPoolsOriginal.length === 0) return subgraphPoolsOriginal;

  const supportedPoolTypes: string[] = Object.values(PoolType);
  const filteredPools = subgraphPoolsOriginal.filter((p) => {
    if (!supportedPoolTypes.includes(p.poolType)) {
      console.warn(`Unknown pool type: ${p.poolType} ${p.id}`);
      return false;
    } else return true;
  });
  const poolIds = filteredPools.map((p) => p.id);
  const weightedPoolIdxs: number[] = [];
  const linearPoolIdxs: number[] = [];
  const ampPoolIdxs: number[] = [];
  // scaling factors are used to find token rates
  const scalingFactorPoolIdxs: number[] = [];
  // ratePools call .getRate() on pool
  // const ratePoolIdexes: number[] = [];

  for (const pool of filteredPools) {
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

  const queryContract = BalancerPoolDataQueries__factory.connect(
    dataQueryAddr,
    provider
  );

  const config: PoolDataQueryConfigStruct = {
    loadTokenBalanceUpdatesAfterBlock: true,
    blockNumber: 0, // always get balances from all pools
    loadAmps: ampPoolIdxs.length > 0,
    ampPoolIdxs,
    loadSwapFees: true,
    swapFeeTypes: Array(poolIds.length).fill(
      PoolQuerySwapFeeType.SWAP_FEE_PERCENTAGE
    ),
    loadTotalSupply: true,
    totalSupplyTypes: supplyTypes(filteredPools),
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

  const queryResult = await queryContract.getPoolData(poolIds, config);
  const updatedPools = mapQueryResultToPools({
    pools: filteredPools,
    ampPoolIdxs,
    weightedPoolIdxs,
    linearPoolIdxs,
    scalingFactorPoolIdxs,
    queryResult,
  });
  // GyroEV2 requires tokenRates onchain update that dataQueries does not provide
  decorateGyroEv2(updatedPools, multicallAddr, provider);
  return updatedPools;
}

/**
 * Update pool tokenRates using mulitcall
 * @param pools
 * @param multicallAddr
 * @param provider
 */
async function decorateGyroEv2<
  GenericPool extends Omit<SubgraphPoolBase | Pool, 'tokens'> & {
    tokens: Tokens;
  }
>(
  pools: GenericPool[],
  multicallAddr: string,
  provider: Provider
): Promise<void> {
  const gyroPools = pools.filter((p) => {
    return (
      p.poolType === 'GyroE' && p.poolTypeVersion && p.poolTypeVersion === 2
    );
  });
  // Use multicall to get tokenRates for all GyroE V2
  const gyroTokenRates = await getGyroTokenRates(
    gyroPools,
    multicallAddr,
    provider
  );
  gyroPools.forEach((pool) => {
    if (gyroTokenRates[pool.id]) {
      pool.tokenRates = gyroTokenRates[pool.id].tokenRates?.map((r) =>
        formatFixed(r, 18)
      );
    } else {
      console.warn(`GyroE V2 Missing tokenRates: `, pool.id);
    }
  });
}

/**
 * Map EVM values to Human scale pool.
 * @param input
 * @returns Array of pools with human scale values.
 */
function mapQueryResultToPools<
  GenericPool extends Omit<SubgraphPoolBase | Pool, 'tokens'> & {
    tokens: Tokens;
  }
>(
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

function mapPoolTokens<
  GenericPool extends Omit<SubgraphPoolBase | Pool, 'tokens'> & {
    tokens: Tokens;
  }
>(
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
    if (t.priceRate === '1') t.priceRate = '1.0'; // TODO - Just for compare
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

function supplyTypes<
  GenericPool extends Omit<SubgraphPoolBase | Pool, 'tokens'> & {
    tokens: Tokens;
  }
>(pools: GenericPool[]): PoolQueriesTotalSupplyType[] {
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

async function getGyroTokenRates<
  GenericPool extends Pick<
    SubgraphPoolBase | Pool,
    'poolType' | 'poolTypeVersion' | 'id' | 'address'
  >
>(
  gyroPools: GenericPool[],
  multiAddress: string,
  provider: Provider
): Promise<TokenRates> {
  if (gyroPools.length === 0) return {} as TokenRates;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const abis: any = Object.values(
    // Remove duplicate entries using their names
    Object.fromEntries(
      [...(GyroEV2__factory.abi as readonly JsonFragment[])].map((row) => [
        row.name,
        row,
      ])
    )
  );
  const multicall = Multicall__factory.connect(multiAddress, provider);
  const multiPool = new Multicaller(multicall, abis);
  gyroPools.forEach((pool) => {
    if (!(pool.poolType === PoolType.GyroE && pool.poolTypeVersion === 2)) {
      console.warn(
        `Incorrectly calling tokenRates on pool: ${pool.poolType} ${pool.id}`
      );
      return;
    }
    multiPool.call(`${pool.id}.tokenRates`, pool.address, 'getTokenRates');
  });

  let tokenRates = {} as TokenRates;
  try {
    tokenRates = (await multiPool.execute()) as TokenRates;
  } catch (err) {
    console.log(err);
    throw new Error(`Issue with multicall execution.`); // TODO
  }
  return tokenRates;
}

export async function getOnChainBalances<
  GenericPool extends Omit<SubgraphPoolBase | Pool, 'tokens'> & {
    tokens: Tokens;
  }
>(
  subgraphPoolsOriginal: GenericPool[],
  multiAddress: string,
  vaultAddress: string,
  provider: Provider
): Promise<GenericPool[]> {
  if (subgraphPoolsOriginal.length === 0) return subgraphPoolsOriginal;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const abis: any = Object.values(
    // Remove duplicate entries using their names
    Object.fromEntries(
      [
        ...(Vault__factory.abi as readonly JsonFragment[]),
        ...(StaticATokenRateProvider__factory.abi as readonly JsonFragment[]),
        ...(WeightedPool__factory.abi as readonly JsonFragment[]),
        ...(StablePool__factory.abi as readonly JsonFragment[]),
        ...(ConvergentCurvePool__factory.abi as readonly JsonFragment[]),
        ...(LinearPool__factory.abi as readonly JsonFragment[]),
        ...(ComposableStablePool__factory.abi as readonly JsonFragment[]),
        ...(GyroEV2__factory.abi as readonly JsonFragment[]),
      ].map((row) => [row.name, row])
    )
  );

  const multicall = Multicall__factory.connect(multiAddress, provider);

  const multiPool = new Multicaller(multicall, abis);

  const supportedPoolTypes: string[] = Object.values(PoolType);
  const subgraphPools: GenericPool[] = [];
  subgraphPoolsOriginal.forEach((pool) => {
    if (!supportedPoolTypes.includes(pool.poolType)) {
      console.warn(`Unknown pool type: ${pool.poolType} ${pool.id}`);
      return;
    }

    subgraphPools.push(pool);

    multiPool.call(`${pool.id}.poolTokens`, vaultAddress, 'getPoolTokens', [
      pool.id,
    ]);
    multiPool.call(`${pool.id}.totalSupply`, pool.address, 'totalSupply');

    switch (pool.poolType) {
      case 'LiquidityBootstrapping':
      case 'Investment':
      case 'Weighted':
        multiPool.call(
          `${pool.id}.swapFee`,
          pool.address,
          'getSwapFeePercentage'
        );
        multiPool.call(
          `${pool.id}.weights`,
          pool.address,
          'getNormalizedWeights'
        );
        if (pool.poolTypeVersion && pool.poolTypeVersion > 1)
          multiPool.call(
            `${pool.id}.actualSupply`,
            pool.address,
            'getActualSupply'
          );
        break;
      case 'StablePhantom':
        multiPool.call(
          `${pool.id}.virtualSupply`,
          pool.address,
          'getVirtualSupply'
        );
        multiPool.call(
          `${pool.id}.amp`,
          pool.address,
          'getAmplificationParameter'
        );
        multiPool.call(
          `${pool.id}.swapFee`,
          pool.address,
          'getSwapFeePercentage'
        );
        break;
      // MetaStable is the same as Stable for multicall purposes
      case 'MetaStable':
      case 'Stable':
        multiPool.call(
          `${pool.id}.amp`,
          pool.address,
          'getAmplificationParameter'
        );
        multiPool.call(
          `${pool.id}.swapFee`,
          pool.address,
          'getSwapFeePercentage'
        );
        break;
      case 'ComposableStable':
        /**
         * Returns the effective BPT supply.
         * In other pools, this would be the same as `totalSupply`, but there are two key differences here:
         *  - this pool pre-mints BPT and holds it in the Vault as a token, and as such we need to subtract the Vault's
         *    balance to get the total "circulating supply". This is called the 'virtualSupply'.
         *  - the Pool owes debt to the Protocol in the form of unminted BPT, which will be minted immediately before the
         *    next join or exit. We need to take these into account since, even if they don't yet exist, they will
         *    effectively be included in any Pool operation that involves BPT.
         * In the vast majority of cases, this function should be used instead of `totalSupply()`.
         */
        multiPool.call(
          `${pool.id}.actualSupply`,
          pool.address,
          'getActualSupply'
        );
        // MetaStable & StablePhantom is the same as Stable for multicall purposes
        multiPool.call(
          `${pool.id}.amp`,
          pool.address,
          'getAmplificationParameter'
        );
        multiPool.call(
          `${pool.id}.swapFee`,
          pool.address,
          'getSwapFeePercentage'
        );
        break;
      case 'Element':
        multiPool.call(`${pool.id}.swapFee`, pool.address, 'percentFee');
        break;
      case 'Gyro2':
      case 'Gyro3':
        multiPool.call(`${pool.id}.poolTokens`, vaultAddress, 'getPoolTokens', [
          pool.id,
        ]);
        multiPool.call(`${pool.id}.totalSupply`, pool.address, 'totalSupply');
        multiPool.call(
          `${pool.id}.swapFee`,
          pool.address,
          'getSwapFeePercentage'
        );
        break;
      case 'GyroE':
        multiPool.call(
          `${pool.id}.swapFee`,
          pool.address,
          'getSwapFeePercentage'
        );
        if (pool.poolTypeVersion && pool.poolTypeVersion === 2) {
          multiPool.call(
            `${pool.id}.tokenRates`,
            pool.address,
            'getTokenRates'
          );
        }
        break;
      default:
        //Handling all Linear pools
        if (pool.poolType.toString().includes('Linear')) {
          multiPool.call(
            `${pool.id}.virtualSupply`,
            pool.address,
            'getVirtualSupply'
          );
          multiPool.call(
            `${pool.id}.swapFee`,
            pool.address,
            'getSwapFeePercentage'
          );
          multiPool.call(`${pool.id}.targets`, pool.address, 'getTargets');
          multiPool.call(
            `${pool.id}.rate`,
            pool.address,
            'getWrappedTokenRate'
          );
        }
        break;
    }
  });

  let pools = {} as Record<
    string,
    {
      amp?: string[];
      swapFee: string;
      weights?: string[];
      targets?: string[];
      poolTokens: {
        tokens: string[];
        balances: string[];
      };
      totalSupply: string;
      virtualSupply?: string;
      rate?: string;
      actualSupply?: string;
      tokenRates?: string[];
    }
  >;

  try {
    pools = (await multiPool.execute()) as Record<
      string,
      {
        amp?: string[];
        swapFee: string;
        weights?: string[];
        poolTokens: {
          tokens: string[];
          balances: string[];
        };
        totalSupply: string;
        virtualSupply?: string;
        rate?: string;
        actualSupply?: string;
        tokenRates?: string[];
      }
    >;
  } catch (err) {
    throw new Error(`Issue with multicall execution.`);
  }

  const onChainPools: GenericPool[] = [];

  Object.entries(pools).forEach(([poolId, onchainData], index) => {
    try {
      const {
        poolTokens,
        swapFee,
        weights,
        totalSupply,
        virtualSupply,
        actualSupply,
        tokenRates,
      } = onchainData;

      if (
        subgraphPools[index].poolType === 'Stable' ||
        subgraphPools[index].poolType === 'MetaStable' ||
        subgraphPools[index].poolType === 'StablePhantom' ||
        subgraphPools[index].poolType === 'ComposableStable'
      ) {
        if (!onchainData.amp) {
          console.error(`Stable Pool Missing Amp: ${poolId}`);
          return;
        } else {
          // Need to scale amp by precision to match expected Subgraph scale
          // amp is stored with 3 decimals of precision
          subgraphPools[index].amp = formatFixed(onchainData.amp[0], 3);
        }
      }

      if (subgraphPools[index].poolType.includes('Linear')) {
        if (!onchainData.targets) {
          console.error(`Linear Pool Missing Targets: ${poolId}`);
          return;
        } else {
          subgraphPools[index].lowerTarget = formatFixed(
            onchainData.targets[0],
            18
          );
          subgraphPools[index].upperTarget = formatFixed(
            onchainData.targets[1],
            18
          );
        }

        const wrappedIndex = subgraphPools[index].wrappedIndex;
        if (wrappedIndex === undefined || onchainData.rate === undefined) {
          console.error(
            `Linear Pool Missing WrappedIndex or PriceRate: ${poolId}`
          );
          return;
        }
        // Update priceRate of wrappedToken
        subgraphPools[index].tokens[wrappedIndex].priceRate = formatFixed(
          onchainData.rate,
          18
        );
      }

      if (subgraphPools[index].poolType !== 'FX')
        subgraphPools[index].swapFee = formatFixed(swapFee, 18);

      poolTokens.tokens.forEach((token, i) => {
        const tokens = subgraphPools[index].tokens;
        const T = tokens.find((t) => isSameAddress(t.address, token));
        if (!T) throw `Pool Missing Expected Token: ${poolId} ${token}`;
        T.balance = formatFixed(poolTokens.balances[i], T.decimals);
        if (weights) {
          // Only expected for WeightedPools
          T.weight = formatFixed(weights[i], 18);
        }
      });

      // Pools with pre minted BPT
      if (
        subgraphPools[index].poolType.includes('Linear') ||
        subgraphPools[index].poolType === 'StablePhantom'
      ) {
        if (virtualSupply === undefined) {
          console.warn(
            `Pool with pre-minted BPT missing Virtual Supply: ${poolId}`
          );
          return;
        }
        subgraphPools[index].totalShares = formatFixed(virtualSupply, 18);
      } else if (
        subgraphPools[index].poolType === 'ComposableStable' ||
        (subgraphPools[index].poolType === 'Weighted' &&
          subgraphPools[index].poolTypeVersion! > 1)
      ) {
        if (actualSupply === undefined) {
          console.warn(`ComposableStable missing Actual Supply: ${poolId}`);
          return;
        }
        subgraphPools[index].totalShares = formatFixed(actualSupply, 18);
      } else {
        subgraphPools[index].totalShares = formatFixed(totalSupply, 18);
      }

      if (
        subgraphPools[index].poolType === 'GyroE' &&
        subgraphPools[index].poolTypeVersion == 2
      ) {
        if (!Array.isArray(tokenRates) || tokenRates.length !== 2) {
          console.error(
            `GyroEV2 pool with missing or invalid tokenRates: ${poolId}`
          );
          return;
        }
        subgraphPools[index].tokenRates = tokenRates.map((rate) =>
          formatFixed(rate, 18)
        );
      }

      subgraphPools[index].tokens.forEach((t) => {
        if (t.priceRate === '1') {
          t.priceRate = '1.0';
        }
      });

      onChainPools.push(subgraphPools[index]);
    } catch (err) {
      throw new Error(`Issue with pool onchain data: ${err}`);
    }
  });
  return onChainPools;
}
