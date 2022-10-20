export { LiquidityGauge } from './liquidity-gauges/provider';
export { PoolAttribute } from './pool/types';
export { TokenAttribute } from './token/types';
export { ProtocolFees } from './protocol-fees/provider';

export interface Findable<T, P = string> {
  find: (id: string) => Promise<T | undefined>;
  findBy: (attribute: P, value: string) => Promise<T | undefined>;
}

export interface Searchable<T> {
  all: () => Promise<T[]>;
  where: (filters: (arg: T) => boolean) => Promise<T[]>;
}
