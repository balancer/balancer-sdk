import { MetaStablePoolLiquidity } from './concerns/metaStable/liquidity.concern';
import { MetaStablePoolSpotPrice } from './concerns/metaStable/spotPrice.concern';
import { MetaStablePoolPriceImpact } from './concerns/metaStable/priceImpact.concern';
import { PoolType } from './pool-type.interface';
import {
  LiquidityConcern,
  SpotPriceConcern,
  PriceImpactConcern,
} from './concerns/types';

export class MetaStable implements PoolType {
  public liquidityCalculator: LiquidityConcern;
  public spotPriceCalculator: SpotPriceConcern;
  public priceImpactCalculator: PriceImpactConcern;

  constructor(
    private liquidityCalculatorConcern = MetaStablePoolLiquidity,
    private spotPriceCalculatorConcern = MetaStablePoolSpotPrice,
    private priceImpactCalculatorConcern = MetaStablePoolPriceImpact
  ) {
    this.liquidityCalculator = new this.liquidityCalculatorConcern();
    this.spotPriceCalculator = new this.spotPriceCalculatorConcern();
    this.priceImpactCalculator = new this.priceImpactCalculatorConcern();
  }
}
