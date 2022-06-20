import { LinearPoolLiquidity } from './concerns/linear/liquidity.concern';
import { LinearPoolSpotPrice } from './concerns/linear/spotPrice.concern';
import { PoolType } from './pool-type.interface';
import {
  ExitConcern,
  JoinConcern,
  LiquidityConcern,
  SpotPriceConcern,
} from './concerns/types';
import { LinearPoolJoin } from './concerns/linear/join.concern';
import { LinearPoolExit } from './concerns/linear/exit.concern';

export class Linear implements PoolType {
  public liquidity: LiquidityConcern;
  public spotPriceCalculator: SpotPriceConcern;
  public joinCalculator: JoinConcern;
  public exitCalculator: ExitConcern;

  constructor(
    private liquidityConcern = LinearPoolLiquidity,
    private spotPriceCalculatorConcern = LinearPoolSpotPrice,
    private joinCalculatorConcern = LinearPoolJoin,
    private exitCalculatorConcern = LinearPoolExit
  ) {
    this.liquidity = new this.liquidityConcern();
    this.spotPriceCalculator = new this.spotPriceCalculatorConcern();
    this.joinCalculator = new this.joinCalculatorConcern();
    this.exitCalculator = new this.exitCalculatorConcern();
  }
}
