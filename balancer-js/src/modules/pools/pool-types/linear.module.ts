import { LinearPoolLiquidity } from './concerns/linear/liquidity.concern';
import { LinearPoolSpotPrice } from './concerns/linear/spotPrice.concern';
import { PoolType } from './pool-type.interface';
import {
  JoinConcern,
  LiquidityConcern,
  SpotPriceConcern,
} from './concerns/types';
import { LinearPoolJoin } from './concerns/linear/join.concern';

export class Linear implements PoolType {
  public liquidity: LiquidityConcern;
  public spotPriceCalculator: SpotPriceConcern;
  public join: JoinConcern;

  constructor(
    private liquidityConcern = LinearPoolLiquidity,
    private spotPriceCalculatorConcern = LinearPoolSpotPrice,
    private joinConcern = LinearPoolJoin
  ) {
    this.liquidity = new this.liquidityConcern();
    this.spotPriceCalculator = new this.spotPriceCalculatorConcern();
    this.join = new this.joinConcern();
  }
}
