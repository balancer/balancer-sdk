import { StablePoolLiquidity } from './concerns/stable/liquidity.concern';
import { StablePoolSpotPrice } from './concerns/stable/spotPrice.concern';
import { StablePoolPriceImpact } from './concerns/stable/priceImpact.concern';
import { ComposableStablePoolExit } from './concerns/composableStable/exit.concern';
import { PoolType } from './pool-type.interface';
import {
  ExitConcern,
  JoinConcern,
  LiquidityConcern,
  PriceImpactConcern,
  SpotPriceConcern,
} from './concerns/types';
import { ComposableStablePoolJoin } from '@/modules/pools/pool-types/concerns/composableStable/join.concern';

export class ComposableStable implements PoolType {
  constructor(
    public exit: ExitConcern = new ComposableStablePoolExit(),
    public join: JoinConcern = new ComposableStablePoolJoin(),
    public liquidity: LiquidityConcern = new StablePoolLiquidity(),
    public spotPriceCalculator: SpotPriceConcern = new StablePoolSpotPrice(),
    public priceImpactCalculator: PriceImpactConcern = new StablePoolPriceImpact()
  ) {}
}
