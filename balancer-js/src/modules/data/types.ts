/* eslint-disable @typescript-eslint/no-explicit-any */

export { LiquidityGauge } from './liquidity-gauges/provider';
export { RewardData } from './liquidity-gauges/multicall';
export { PoolAttribute } from './pool/types';
export { TokenAttribute } from './token/types';
export { ProtocolFees } from './protocol-fees/provider';
export * from './pool-gauges/types';
export * from './pool-shares/types';
export * from './gauge-shares/types';

export interface Findable<T, P = string, V = any> {
  find: (id: string, refresh?: boolean) => Promise<T | undefined>;
  findBy: (attribute: P, value: V) => Promise<T | undefined>;
}

export interface Searchable<T> {
  all: () => Promise<T[]>;
  where: (filters: (arg: T) => boolean) => Promise<T[]>;
}

export interface Cacheable<T> {
  refresh: (arg: T) => Promise<T>;
}
