import { StablePoolLiquidity } from './concerns/stable/liquidity.concern';
import { StablePoolSpotPrice } from './concerns/stable/spotPrice.concern';
import { StablePriceImpact } from './concerns/stable/priceImpact.concern';
import { PoolType } from './pool-type.interface';
import {
  LiquidityConcern,
  PriceImpactConcern,
  SpotPriceConcern,
} from './concerns/types';

export class Stable implements PoolType {
  public liquidityCalculator: LiquidityConcern;
  public spotPriceCalculator: SpotPriceConcern;
  public priceImpactCalculator: PriceImpactConcern;

  constructor(
    private liquidityCalculatorConcern = StablePoolLiquidity,
    private spotPriceCalculatorConcern = StablePoolSpotPrice,
    private priceImpactCalculatorConcern = StablePriceImpact
  ) {
    this.liquidityCalculator = new this.liquidityCalculatorConcern();
    this.spotPriceCalculator = new this.spotPriceCalculatorConcern();
    this.priceImpactCalculator = new this.priceImpactCalculatorConcern();
  }
}
