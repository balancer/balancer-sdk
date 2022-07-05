import { LinearPoolLiquidity } from './concerns/linear/liquidity.concern';
import { LinearPoolSpotPrice } from './concerns/linear/spotPrice.concern';
import { LinearPriceImpact } from './concerns/linear/priceImpact.concern';
import { PoolType } from './pool-type.interface';
import {
  LiquidityConcern,
  PriceImpactConcern,
  SpotPriceConcern,
} from './concerns/types';

export class Linear implements PoolType {
  public liquidity: LiquidityConcern;
  public spotPriceCalculator: SpotPriceConcern;
  public priceImpactCalculator: PriceImpactConcern;

  constructor(
    private liquidityConcern = LinearPoolLiquidity,
    private spotPriceCalculatorConcern = LinearPoolSpotPrice,
    private priceImpactCalculatorConcern = LinearPriceImpact
  ) {
    this.liquidity = new this.liquidityConcern();
    this.spotPriceCalculator = new this.spotPriceCalculatorConcern();
    this.priceImpactCalculator = new this.priceImpactCalculatorConcern();
  }
}
