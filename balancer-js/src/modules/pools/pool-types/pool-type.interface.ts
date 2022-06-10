import { LiquidityConcern, SpotPriceConcern } from './concerns/types';

export interface PoolType {
  liquidityCalculator: LiquidityConcern;
  spotPriceCalculator: SpotPriceConcern;
}
