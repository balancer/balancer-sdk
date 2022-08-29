import { MetaStablePoolExit } from './concerns/metaStable/exit.concern';
import { MetaStablePoolJoin } from './concerns/metaStable/join.concern';
import { MetaStablePoolLiquidity } from './concerns/metaStable/liquidity.concern';
import { MetaStablePoolSpotPrice } from './concerns/metaStable/spotPrice.concern';
import { MetaStablePoolPriceImpact } from './concerns/metaStable/priceImpact.concern';
import { PoolType } from './pool-type.interface';
import {
  ExitConcern,
  JoinConcern,
  LiquidityConcern,
  SpotPriceConcern,
  PriceImpactConcern,
} from './concerns/types';

export class MetaStable implements PoolType {
  constructor(
    public exit: ExitConcern = new MetaStablePoolExit(),
    public join: JoinConcern = new MetaStablePoolJoin(),
    public liquidity: LiquidityConcern = new MetaStablePoolLiquidity(),
    public spotPriceCalculator: SpotPriceConcern = new MetaStablePoolSpotPrice(),
    public priceImpactCalculator: PriceImpactConcern = new MetaStablePoolPriceImpact()
  ) {}
}
