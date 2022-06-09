import { StablePhantomPoolLiquidity } from './concerns/stablePhantom/liquidity.concern';
import { StablePhantomPoolSpotPrice } from './concerns/stablePhantom/spotPrice.concern';
import { StablePhantomPoolJoin } from './concerns/stablePhantom/join.concern';
import { PoolType } from './pool-type.interface';
import {
  ExitConcern,
  JoinConcern,
  LiquidityConcern,
  SpotPriceConcern,
} from './concerns/types';
import { StablePhantomPoolExit } from './concerns/stablePhantom/exit.concern';

export class StablePhantom implements PoolType {
  public liquidityCalculator: LiquidityConcern;
  public spotPriceCalculator: SpotPriceConcern;
  public joinCalculator: JoinConcern;
  public exitCalculator: ExitConcern;

  constructor(
    private liquidityCalculatorConcern = StablePhantomPoolLiquidity,
    private spotPriceCalculatorConcern = StablePhantomPoolSpotPrice,
    public joinCalculatorConcern = StablePhantomPoolJoin,
    public exitCalculatorConcern = StablePhantomPoolExit
  ) {
    this.liquidityCalculator = new this.liquidityCalculatorConcern();
    this.spotPriceCalculator = new this.spotPriceCalculatorConcern();
    this.joinCalculator = new this.joinCalculatorConcern();
    this.exitCalculator = new this.exitCalculatorConcern();
  }
}
