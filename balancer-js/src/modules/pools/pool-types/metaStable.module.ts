import { MetaStablePoolLiquidity } from './concerns/metaStable/liquidity.concern';
import { MetaStablePoolSpotPrice } from './concerns/metaStable/spotPrice.concern';
import { StablePoolPriceImpact } from './concerns/stable/priceImpact.concern';
import { PoolType } from './pool-type.interface';
import {
  ExitConcern,
  JoinConcern,
  LiquidityConcern,
  SpotPriceConcern,
  PriceImpactConcern,
} from './concerns/types';
import { StablePoolExit } from '@/modules/pools/pool-types/concerns/stable/exit.concern';
import { StablePoolJoin } from '@/modules/pools/pool-types/concerns/stable/join.concern';

export class MetaStable implements PoolType {
  constructor(
    public exit: ExitConcern = new StablePoolExit(),
    public join: JoinConcern = new StablePoolJoin(),
    public liquidity: LiquidityConcern = new MetaStablePoolLiquidity(),
    public spotPriceCalculator: SpotPriceConcern = new MetaStablePoolSpotPrice(),
    public priceImpactCalculator: PriceImpactConcern = new StablePoolPriceImpact()
  ) {}
}
