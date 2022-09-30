import { StablePhantomPoolJoin } from './concerns/stablePhantom/join.concern';
import { StablePhantomPoolLiquidity } from './concerns/stablePhantom/liquidity.concern';
import { PhantomStablePoolSpotPrice } from './concerns/stablePhantom/spotPrice.concern';
import { StablePhantomPriceImpact } from './concerns/stablePhantom/priceImpact.concern';
import { ComposableStablePoolExit } from './concerns/composableStable/exit.concern';
import { PoolType } from './pool-type.interface';
import {
  ExitConcern,
  JoinConcern,
  LiquidityConcern,
  PriceImpactConcern,
  SpotPriceConcern,
} from './concerns/types';

export class ComposableStable implements PoolType {
  constructor(
    public exit: ExitConcern = new ComposableStablePoolExit(),
    public join: JoinConcern = new StablePhantomPoolJoin(),
    public liquidity: LiquidityConcern = new StablePhantomPoolLiquidity(),
    public spotPriceCalculator: SpotPriceConcern = new PhantomStablePoolSpotPrice(),
    public priceImpactCalculator: PriceImpactConcern = new StablePhantomPriceImpact()
  ) {}
}
