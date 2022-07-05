import { WeightedPoolLiquidity } from './concerns/weighted/liquidity.concern';
import { WeightedPoolSpotPrice } from './concerns/weighted/spotPrice.concern';
import { WeightedPoolPriceImpact } from './concerns/weighted/priceImpact.concern';
import { PoolType } from './pool-type.interface';
import {
  LiquidityConcern,
  PriceImpactConcern,
  SpotPriceConcern,
} from './concerns/types';

export class Weighted implements PoolType {
  public liquidity: LiquidityConcern;
  public spotPriceCalculator: SpotPriceConcern;
  public priceImpactCalculator: PriceImpactConcern;

  constructor(
    private liquidityConcern = WeightedPoolLiquidity,
    private spotPriceCalculatorConcern = WeightedPoolSpotPrice,
    private priceImpactCalculatorConcern = WeightedPoolPriceImpact
  ) {
    this.liquidity = new this.liquidityConcern();
    this.spotPriceCalculator = new this.spotPriceCalculatorConcern();
    this.priceImpactCalculator = new this.priceImpactCalculatorConcern();
  }
}
