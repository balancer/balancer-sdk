import { MetaStablePoolLiquidity } from './concerns/metaStable/liquidity.concern';
import { MetaStablePoolSpotPrice } from './concerns/metaStable/spotPrice.concern';
import { PoolType } from './pool-type.interface';
import {
  ExitConcern,
  JoinConcern,
  LiquidityConcern,
  SpotPriceConcern,
} from './concerns/types';
import { MetaStablePoolJoin } from './concerns/metaStable/join.concern';
import { MetaStablePoolExit } from './concerns/metaStable/exit.concern';

export class MetaStable implements PoolType {
  public liquidity: LiquidityConcern;
  public spotPriceCalculator: SpotPriceConcern;
  public joinCalculator: JoinConcern;
  public exitCalculator: ExitConcern;

  constructor(
    private liquidityConcern = MetaStablePoolLiquidity,
    private spotPriceCalculatorConcern = MetaStablePoolSpotPrice,
    private joinCalculatorConcern = MetaStablePoolJoin,
    private exitCalculatorConcern = MetaStablePoolExit
  ) {
    this.liquidity = new this.liquidityConcern();
    this.spotPriceCalculator = new this.spotPriceCalculatorConcern();
    this.joinCalculator = new this.joinCalculatorConcern();
    this.exitCalculator = new this.exitCalculatorConcern();
  }
}
