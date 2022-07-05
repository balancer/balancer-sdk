import { StablePhantomPoolLiquidity } from './concerns/stablePhantom/liquidity.concern';
import { StablePhantomPoolSpotPrice } from './concerns/stablePhantom/spotPrice.concern';
import { StablePhantomPoolJoin } from './concerns/stablePhantom/join.concern';
import { PoolType } from './pool-type.interface';
import {
  JoinConcern,
  LiquidityConcern,
  SpotPriceConcern,
} from './concerns/types';

export class StablePhantom implements PoolType {
  public liquidity: LiquidityConcern;
  public spotPriceCalculator: SpotPriceConcern;
  public join: JoinConcern;

  constructor(
    private liquidityConcern = StablePhantomPoolLiquidity,
    private spotPriceCalculatorConcern = StablePhantomPoolSpotPrice,
    public joinConcern = StablePhantomPoolJoin
  ) {
    this.liquidity = new this.liquidityConcern();
    this.spotPriceCalculator = new this.spotPriceCalculatorConcern();
    this.join = new this.joinConcern();
  }
}
