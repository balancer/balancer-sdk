import {
  LiquidityConcern,
  SpotPriceConcern,
  PriceImpactConcern,
} from './concerns/types';

export interface PoolType {
  liquidity: LiquidityConcern;
  spotPriceCalculator: SpotPriceConcern;
  priceImpactCalculator: PriceImpactConcern;
}
