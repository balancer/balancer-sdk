/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { BALANCER_NETWORK_CONFIG } from '@/lib/constants/config';
import { PoolJoinExitRepository, PoolSharesRepository } from '@/modules/data';
import {
  BalancerDataRepositories,
  Cacheable,
  Findable,
  LiquidityGauge,
  Network,
  Pool,
  Price,
  Searchable,
  Token,
} from '@/types';
import { SubgraphPoolDataService } from '@/modules/sor/pool-data/subgraphPoolDataService';

const searchMap = (map: Map<any, any>, field: string, fieldValue: string) => {
  let foundEntry = undefined;
  map.forEach((value, key) => {
    if (value[field] === fieldValue) {
      foundEntry = value;
    }
  });

  return foundEntry;
};

export const findable = <T, P = string, V = any>(
  map: Map<string | V, T>
): Findable<T, P> & Searchable<T> => ({
  find: (id: string) => Promise.resolve(map.get(id)),
  findBy: (param: P, value: V) =>
    Promise.resolve(searchMap(map, param as string, value as string)),
  all: () => Promise.resolve(Object.values(map)),
  where: (filters: (arg: T) => boolean) => Promise.resolve(Object.values(map)),
});

export const stubbed = <T, P = string, V = any>(
  value: unknown
): Findable<T, P, V> & Searchable<T> & Cacheable<T> => ({
  find: (id: string) => Promise.resolve(value as T),
  findBy: (param: P, _: V) => Promise.resolve(value as T),
  all: () => Promise.resolve([value as T]),
  where: (filters: (arg: T) => boolean) => Promise.resolve([value as T]),
  refresh: (obj: T) => Promise.resolve(value as T),
});

export const aaveRates = {
  getRate: (address: string) => Promise.resolve(1),
};

interface IdentifiableArray {
  id: number;
}

export const array2map = <T>(array: T[]): Map<string, T> => {
  const map = new Map();
  for (const item of array) {
    map.set((item as unknown as IdentifiableArray).id, item);
  }
  return map;
};

export const repositores = ({
  pools = stubbed<Pool>(undefined),
  poolsOnChain = stubbed<Pool>(undefined),
  yesterdaysPools = stubbed<Pool>(undefined),
  tokenPrices = stubbed<Price>({ usd: '1' }),
  tokenHistoricalPrices = stubbed<Price>({ usd: '1' }),
  tokenMeta = stubbed<Token>({ decimals: 18 }),
  liquidityGauges = stubbed<LiquidityGauge>(undefined),
  feeDistributor = {
    multicallData: () =>
      Promise.resolve({
        balAmount: 1,
        bbAUsdAmount: 1,
        veBalSupply: 1,
        bbAUsdPrice: 1,
        balAddress: '',
      }),
    getClaimableBalances: () => Promise.resolve({}),
    claimBalances: () => '',
  },
  feeCollector = stubbed<number>(0),
  tokenYields = stubbed<number>(100),
  poolShares = new PoolSharesRepository(
    BALANCER_NETWORK_CONFIG[Network.MAINNET].urls.subgraph,
    Network.MAINNET
  ),
  poolJoinExits = new PoolJoinExitRepository(
    BALANCER_NETWORK_CONFIG[Network.MAINNET].urls.subgraph,
    Network.MAINNET
  ),
}): BalancerDataRepositories => ({
  pools,
  poolsForSimulations: {} as SubgraphPoolDataService,
  poolsOnChain,
  yesterdaysPools,
  tokenPrices,
  tokenHistoricalPrices,
  tokenMeta,
  liquidityGauges,
  feeDistributor,
  feeCollector,
  tokenYields,
  poolShares,
  poolJoinExits,
});
