export { LiquidityGauge } from './liquidity-gauges/provider';

export interface Findable<T, P = string> {
  find: (id: string) => Promise<T | undefined>;
  findBy: (attribute: P, value: string) => Promise<T | undefined>;
  where?: (attributes: P[], values: string[]) => Promise<T[] | undefined>;
}
