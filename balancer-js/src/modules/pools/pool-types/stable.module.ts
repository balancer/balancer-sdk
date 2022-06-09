import { StablePoolLiquidity } from './concerns/stable/liquidity.concern';
import { StablePoolSpotPrice } from './concerns/stable/spotPrice.concern';
import { PoolType } from './pool-type.interface';
import {
  ExitConcern,
  JoinConcern,
  LiquidityConcern,
  SpotPriceConcern,
} from './concerns/types';
import { StablePoolJoin } from './concerns/stable/join.concern';
import { StablePoolExit } from './concerns/stable/exit.concern';

export class Stable implements PoolType {
  public liquidityCalculator: LiquidityConcern;
  public spotPriceCalculator: SpotPriceConcern;
  public joinCalculator: JoinConcern;
  public exitCalculator: ExitConcern;

  constructor(
    private liquidityCalculatorConcern = StablePoolLiquidity,
    private spotPriceCalculatorConcern = StablePoolSpotPrice,
    private joinCalculatorConcern = StablePoolJoin,
    private exitCalculatorConcern = StablePoolExit
  ) {
    this.liquidityCalculator = new this.liquidityCalculatorConcern();
    this.spotPriceCalculator = new this.spotPriceCalculatorConcern();
    this.joinCalculator = new this.joinCalculatorConcern();
    this.exitCalculator = new this.exitCalculatorConcern();
  }
}
