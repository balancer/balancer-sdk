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
  FXPool__factory,
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
        ...(FXPool__factory.abi as readonly JsonFragment[]),
      ].map((row) => [row.name, row])
    )
  );

  const multicall = Multicall__factory.connect(multiAddress, provider);

  const multiPool = new Multicaller(multicall, abis);

  const supportedPoolTypes: string[] = Object.values(PoolType);
  const subgraphPools: GenericPool[] = [];
  subgraphPoolsOriginal.forEach((pool) => {
    if (
      !supportedPoolTypes.includes(pool.poolType) ||
      pool.poolType === 'Managed'
    ) {
      const logger = Logger.getInstance();
      logger.warn(`Unknown pool type: ${pool.poolType} ${pool.id}`);
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
      case 'FX':
        multiPool.call(
          `${pool.id}.swapFee`,
          pool.address,
          'protocolPercentFee'
        );
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
          // AaveLinear pools with version === 1 rates will still work
          if (pool.poolType === 'AaveLinear' && pool.poolTypeVersion === 1) {
            multiPool.call(
              `${pool.id}.rate`,
              pool.address,
              'getWrappedTokenRate'
            );
          }
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

        if (
          subgraphPools[index].poolType === 'AaveLinear' &&
          subgraphPools[index].poolTypeVersion === 1
        ) {
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
      }

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
          const logger = Logger.getInstance();
          logger.warn(
            `Pool with pre-minted BPT missing Virtual Supply: ${poolId}`
          );
          return;
        }
        subgraphPools[index].totalShares = formatFixed(virtualSupply, 18);
      } else if (subgraphPools[index].poolType === 'ComposableStable') {
        if (actualSupply === undefined) {
          const logger = Logger.getInstance();
          logger.warn(`ComposableStable missing Actual Supply: ${poolId}`);
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

      onChainPools.push(subgraphPools[index]);
    } catch (err) {
      throw new Error(`Issue with pool onchain data: ${err}`);
    }
  });
  return onChainPools;
}
