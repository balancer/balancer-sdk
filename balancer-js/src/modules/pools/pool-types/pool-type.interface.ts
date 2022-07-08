import {
  JoinConcern,
  LiquidityConcern,
  SpotPriceConcern,
} from './concerns/types';

export interface PoolType {
  liquidity: LiquidityConcern;
  spotPriceCalculator: SpotPriceConcern;
  join: JoinConcern;
}
