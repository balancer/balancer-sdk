/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  BalancerDataRepositories,
  Findable,
  LiquidityGauge,
  Pool,
  Price,
  Searchable,
  Token,
} from '@/types';

export const findable = <T, P = string>(
  map: Map<string, T>
): Findable<T, P> & Searchable<T> => ({
  find: (id: string) => Promise.resolve(map.get(id)),
  findBy: (param: P, value: string) => Promise.resolve(map.get(value)),
  all: () => Promise.resolve(Object.values(map)),
  where: (filters: (arg: T) => boolean) => Promise.resolve(Object.values(map)),
});

export const stubbed = <T, P = string>(
  value: unknown
): Findable<T, P> & Searchable<T> => ({
  find: (id: string) => Promise.resolve(value as T),
  findBy: (param: P, _: string) => Promise.resolve(value as T),
  all: () => Promise.resolve([value as T]),
  where: (filters: (arg: T) => boolean) => Promise.resolve([value as T]),
});

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
  yesterdaysPools = stubbed<Pool>(undefined),
  tokenPrices = stubbed<Price>({ usd: '1' }),
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
  },
  feeCollector = stubbed<number>(0),
  tokenYields = stubbed<number>(100),
}): BalancerDataRepositories => ({
  pools,
  yesterdaysPools,
  tokenPrices,
  tokenMeta,
  liquidityGauges,
  feeDistributor,
  feeCollector,
  tokenYields,
});
