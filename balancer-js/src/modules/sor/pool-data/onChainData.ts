import { Provider } from '@ethersproject/providers';
import { SubgraphPoolBase, SubgraphToken } from '@balancer-labs/sor';
import { Pool, PoolToken, PoolType } from '@/types';
import { decorateGyroEv2 } from './multicall/gyroEv2';
import { getPoolsFromDataQuery } from './poolDataQueries';
import { Logger } from '@/lib/utils/logger';
import { decorateFx } from './multicall/fx';
import { formatFixed } from '@ethersproject/bignumber';
import {
  ComposableStablePool__factory,
  ConvergentCurvePool__factory,
  GyroEV2__factory,
  LinearPool__factory,
  Multicall__factory,
  StablePool__factory,
  StaticATokenRateProvider__factory,
  Vault__factory,
  WeightedPool__factory,
} from '@/contracts';
import { JsonFragment } from '@ethersproject/abi';
import { Multicaller } from '@/lib/utils/multiCaller';
import { isSameAddress } from '@/lib/utils';
import _ from 'lodash';
import { MulticallPool } from '@/modules/sor/pool-data/types';

export type Tokens = (SubgraphToken | PoolToken)[];

export type BalancerPool = Omit<SubgraphPoolBase | Pool, 'tokens'> & {
  tokens: Tokens;
};

export async function getOnChainPools<GenericPool extends BalancerPool>(
  subgraphPoolsOriginal: GenericPool[],
  dataQueryAddr: string,
  multicallAddr: string,
  provider: Provider
): Promise<GenericPool[]> {
  if (subgraphPoolsOriginal.length === 0) return subgraphPoolsOriginal;

  const supportedPoolTypes: string[] = Object.values(PoolType);
  const filteredPools = subgraphPoolsOriginal.filter((p) => {
    if (!supportedPoolTypes.includes(p.poolType) || p.poolType === 'Managed') {
      const logger = Logger.getInstance();
      logger.warn(`Unknown pool type: ${p.poolType} ${p.id}`);
      return false;
    } else return true;
  });
  const onChainPools = await getPoolsFromDataQuery(
    filteredPools,
    dataQueryAddr,
    provider
  );
  // GyroEV2 requires tokenRates onchain update that dataQueries does not provide
  await decorateGyroEv2(onChainPools, multicallAddr, provider);
  await decorateFx(onChainPools, multicallAddr, provider);
  return onChainPools;
}

export async function getOnChainBalances<
  GenericPool extends Omit<SubgraphPoolBase | Pool, 'tokens'> & {
    tokens: (SubgraphToken | PoolToken)[];
  }
>(
  subgraphPoolsOriginal: GenericPool[],
  multiAddress: string,
  vaultAddress: string,
  provider: Provider,
  chunkSize?: number
): Promise<GenericPool[]> {
  if (subgraphPoolsOriginal.length === 0) return subgraphPoolsOriginal;

  const { multipools, poolsToBeCalledByChunk } = generateMultipools(
    subgraphPoolsOriginal,
    vaultAddress,
    multiAddress,
    provider,
    chunkSize
  );

  const { multicallPools, calledPools } = await executeChunks(
    multipools,
    poolsToBeCalledByChunk
  );

  const onChainPools: GenericPool[] = [];

  Object.entries(multicallPools).forEach(([poolId, onchainData], index) => {
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
        calledPools[index].poolType === 'Stable' ||
        calledPools[index].poolType === 'MetaStable' ||
        calledPools[index].poolType === 'StablePhantom' ||
        calledPools[index].poolType === 'ComposableStable'
      ) {
        if (!onchainData.amp) {
          console.error(`Stable Pool Missing Amp: ${poolId}`);
          return;
        } else {
          // Need to scale amp by precision to match expected Subgraph scale
          // amp is stored with 3 decimals of precision
          calledPools[index].amp = formatFixed(onchainData.amp[0], 3);
        }
      }

      if (calledPools[index].poolType.includes('Linear')) {
        if (!onchainData.targets) {
          console.error(`Linear Pool Missing Targets: ${poolId}`);
          return;
        } else {
          calledPools[index].lowerTarget = formatFixed(
            onchainData.targets[0],
            18
          );
          calledPools[index].upperTarget = formatFixed(
            onchainData.targets[1],
            18
          );
        }

        const wrappedIndex = calledPools[index].wrappedIndex;
        if (wrappedIndex === undefined || onchainData.rate === undefined) {
          console.error(
            `Linear Pool Missing WrappedIndex or PriceRate: ${poolId}`
          );
          return;
        }
        // Update priceRate of wrappedToken
        calledPools[index].tokens[wrappedIndex].priceRate = formatFixed(
          onchainData.rate,
          18
        );
      }

      if (calledPools[index].poolType !== 'FX')
        calledPools[index].swapFee = formatFixed(swapFee, 18);

      poolTokens.tokens.forEach((token, i) => {
        const tokens = calledPools[index].tokens;
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
        calledPools[index].poolType.includes('Linear') ||
        calledPools[index].poolType === 'StablePhantom'
      ) {
        if (virtualSupply === undefined) {
          const logger = Logger.getInstance();
          logger.warn(
            `Pool with pre-minted BPT missing Virtual Supply: ${poolId}`
          );
          return;
        }
        calledPools[index].totalShares = formatFixed(virtualSupply, 18);
      } else if (calledPools[index].poolType === 'ComposableStable') {
        if (actualSupply === undefined) {
          const logger = Logger.getInstance();
          logger.warn(`ComposableStable missing Actual Supply: ${poolId}`);
          return;
        }
        calledPools[index].totalShares = formatFixed(actualSupply, 18);
      } else {
        calledPools[index].totalShares = formatFixed(totalSupply, 18);
      }

      if (
        calledPools[index].poolType === 'GyroE' &&
        calledPools[index].poolTypeVersion == 2
      ) {
        if (!Array.isArray(tokenRates) || tokenRates.length !== 2) {
          console.error(
            `GyroEV2 pool with missing or invalid tokenRates: ${poolId}`
          );
          return;
        }
        calledPools[index].tokenRates = tokenRates.map((rate) =>
          formatFixed(rate, 18)
        );
      }

      onChainPools.push(calledPools[index]);
    } catch (err) {
      throw new Error(`Issue with pool onchain data: ${err}`);
    }
  });
  return onChainPools;
}

const generateMultipools = <GenericPool extends BalancerPool>(
  pools: GenericPool[],
  vaultAddress: string,
  multiAddress: string,
  provider: Provider,
  chunkSize?: number
): {
  multipools: Multicaller[];
  poolsToBeCalledByChunk: GenericPool[][];
} => {
  const abis: JsonFragment[] = _.uniqBy(
    [
      ...(Vault__factory.abi as readonly JsonFragment[]),
      ...(StaticATokenRateProvider__factory.abi as readonly JsonFragment[]),
      ...(WeightedPool__factory.abi as readonly JsonFragment[]),
      ...(StablePool__factory.abi as readonly JsonFragment[]),
      ...(ConvergentCurvePool__factory.abi as readonly JsonFragment[]),
      ...(LinearPool__factory.abi as readonly JsonFragment[]),
      ...(ComposableStablePool__factory.abi as readonly JsonFragment[]),
      ...(GyroEV2__factory.abi as readonly JsonFragment[]),
    ],
    'name'
  );
  const supportedPoolTypes: string[] = Object.values(PoolType);

  if (!chunkSize) {
    chunkSize = pools.length;
  }

  const chunks: GenericPool[][] = [];
  for (let i = 0; i < pools.length / chunkSize; i += 1) {
    const chunk = pools.slice(i * chunkSize, (i + 1) * chunkSize);
    chunks.push(chunk);
  }
  const poolsToBeCalledByChunk: GenericPool[][] = Array(chunks.length).fill([]);
  const multicallers: Multicaller[] = chunks.map((poolsChunk, chunkIndex) => {
    const multicall = Multicall__factory.connect(multiAddress, provider);
    const multiPool = new Multicaller(multicall, abis);
    poolsChunk.forEach((pool) => {
      if (
        !supportedPoolTypes.includes(pool.poolType) ||
        pool.poolType === 'Managed'
      ) {
        const logger = Logger.getInstance();
        logger.warn(`Unknown pool type: ${pool.poolType} ${pool.id}`);
        return;
      }

      poolsToBeCalledByChunk[chunkIndex].push(pool);

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
          multiPool.call(
            `${pool.id}.poolTokens`,
            vaultAddress,
            'getPoolTokens',
            [pool.id]
          );
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
    return multiPool;
  });

  return { multipools: multicallers, poolsToBeCalledByChunk };
};

const executeChunks = async <GenericPool extends BalancerPool>(
  multipools: Multicaller[],
  poolsToBeCalledByChunk: GenericPool[][]
): Promise<{
  multicallPools: Record<string, MulticallPool>;
  calledPools: GenericPool[];
}> => {
  let calledPools: GenericPool[] = [];
  const acceptedChunks: number[] = [];
  const multicallPools = (
    (await Promise.all(
      multipools.map(async (m, i) => {
        try {
          const records = await m.execute();
          acceptedChunks.push(i);
          return records;
        } catch (error) {
          console.log(acceptedChunks);
          console.warn(`Error in chunk ${i}, discarding chunk`);
          return {};
        }
      })
    )) as Record<string, MulticallPool>[]
  ).reduce((acc, poolsRecord) => {
    return { ...acc, ...poolsRecord };
  }, {});
  acceptedChunks
    .sort()
    .forEach(
      (i) => (calledPools = [...calledPools, ...poolsToBeCalledByChunk[i]])
    );
  return { multicallPools, calledPools };
};
