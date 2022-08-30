import { WeightedPoolExit } from './concerns/weighted/exit.concern';
import { WeightedPoolJoin } from './concerns/weighted/join.concern';
import { WeightedPoolLiquidity } from './concerns/weighted/liquidity.concern';
import { WeightedPoolSpotPrice } from './concerns/weighted/spotPrice.concern';
import { WeightedPoolPriceImpact } from './concerns/weighted/priceImpact.concern';
import { PoolType } from './pool-type.interface';
import {
  ExitConcern,
  JoinConcern,
  LiquidityConcern,
  PriceImpactConcern,
  SpotPriceConcern,
} from './concerns/types';

export class Weighted implements PoolType {
  constructor(
    public exit: ExitConcern = new WeightedPoolExit(),
    public join: JoinConcern = new WeightedPoolJoin(),
    public liquidity: LiquidityConcern = new WeightedPoolLiquidity(),
    public spotPriceCalculator: SpotPriceConcern = new WeightedPoolSpotPrice(),
    public priceImpactCalculator: PriceImpactConcern = new WeightedPoolPriceImpact()
  ) {}
}
