import {
  LiquidityConcern,
  SpotPriceConcern,
  PriceImpactConcern,
} from './concerns/types';

export interface PoolType {
  liquidityCalculator: LiquidityConcern;
  spotPriceCalculator: SpotPriceConcern;
  priceImpactCalculator: PriceImpactConcern;
}
