import { StablePhantomPoolLiquidity } from './concerns/stablePhantom/liquidity.concern';
import { StablePhantomPoolSpotPrice } from './concerns/stablePhantom/spotPrice.concern';
import { PoolType } from './pool-type.interface';
import { LiquidityConcern, SpotPriceConcern } from './concerns/types';

export class StablePhantom implements PoolType {
  public liquidity: LiquidityConcern;
  public spotPriceCalculator: SpotPriceConcern;

  constructor(
    private liquidityConcern = StablePhantomPoolLiquidity,
    private spotPriceCalculatorConcern = StablePhantomPoolSpotPrice
  ) {
    this.liquidity = new this.liquidityConcern();
    this.spotPriceCalculator = new this.spotPriceCalculatorConcern();
  }
}
