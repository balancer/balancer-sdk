import { WeightedPoolLiquidity } from './concerns/weighted/liquidity.concern';
import { WeightedPoolSpotPrice } from './concerns/weighted/spotPrice.concern';
import { WeightedPoolJoin } from './concerns/weighted/join.concern';
import { PoolType } from './pool-type.interface';
import {
  JoinConcern,
  LiquidityConcern,
  SpotPriceConcern,
  ExitConcern,
} from './concerns/types';
import { WeightedPoolExit } from './concerns/weighted/exit.concern';

export class Weighted implements PoolType {
  public liquidity: LiquidityConcern;
  public spotPriceCalculator: SpotPriceConcern;
  public joinCalculator: JoinConcern;
  public exitCalculator: ExitConcern;

  constructor(
    private liquidityConcern = WeightedPoolLiquidity,
    private spotPriceCalculatorConcern = WeightedPoolSpotPrice,
    private joinCalculatorConcern = WeightedPoolJoin,
    private exitCalculatorConcern = WeightedPoolExit
  ) {
    this.liquidity = new this.liquidityConcern();
    this.spotPriceCalculator = new this.spotPriceCalculatorConcern();
    this.joinCalculator = new this.joinCalculatorConcern();
    this.exitCalculator = new this.exitCalculatorConcern();
  }
}
