import { StablePoolLiquidity } from './concerns/stable/liquidity.concern';
import { StablePoolSpotPrice } from './concerns/stable/spotPrice.concern';
import { PoolType } from './pool-type.interface';
import {
  JoinConcern,
  LiquidityConcern,
  SpotPriceConcern,
} from './concerns/types';
import { StablePoolJoin } from './concerns/stable/join.concern';

export class Stable implements PoolType {
  public liquidity: LiquidityConcern;
  public spotPriceCalculator: SpotPriceConcern;
  public join: JoinConcern;

  constructor(
    private liquidityConcern = StablePoolLiquidity,
    private spotPriceCalculatorConcern = StablePoolSpotPrice,
    private joinConcern = StablePoolJoin
  ) {
    this.liquidity = new this.liquidityConcern();
    this.spotPriceCalculator = new this.spotPriceCalculatorConcern();
    this.join = new this.joinConcern();
  }
}
