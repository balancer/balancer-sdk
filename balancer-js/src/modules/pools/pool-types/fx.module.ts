import { PoolType } from './pool-type.interface';
import {
  ExitConcern,
  JoinConcern,
  LiquidityConcern,
  PriceImpactConcern,
  SpotPriceConcern,
} from '@/modules/pools/pool-types/concerns/types';
import { FXExitConcern } from '@/modules/pools/pool-types/concerns/fx/exit.concern';
import { FXLiquidityConcern } from '@/modules/pools/pool-types/concerns/fx/liquidity.concern';
import { FXSpotPriceConcern } from '@/modules/pools/pool-types/concerns/fx/spotPrice.concern';
import { FXPriceImpactConcern } from '@/modules/pools/pool-types/concerns/fx/priceImpact.concern';
import { FXJoinConcern } from '@/modules/pools/pool-types/concerns/fx/join.concern';

export class FX implements PoolType {
  constructor(
    public exit: ExitConcern = new FXExitConcern(),
    public liquidity: LiquidityConcern = new FXLiquidityConcern(),
    public spotPriceCalculator: SpotPriceConcern = new FXSpotPriceConcern(),
    public priceImpactCalculator: PriceImpactConcern = new FXPriceImpactConcern(),
    public join: JoinConcern = new FXJoinConcern()
  ) {}
}
