import { PoolType } from './pool-type.interface';
import {
  ExitConcern,
  JoinConcern,
  LiquidityConcern,
  PriceImpactConcern,
  SpotPriceConcern,
} from '@/modules/pools/pool-types/concerns/types';
import { GyroEExitConcern } from '@/modules/pools/pool-types/concerns/gyro-e/exit.concern';
import { GyroELiquidityConcern } from '@/modules/pools/pool-types/concerns/gyro-e/liquidity.concern';
import { GyroESpotPriceConcern } from '@/modules/pools/pool-types/concerns/gyro-e/spotPrice.concern';
import { GyroEPriceImpactConcern } from '@/modules/pools/pool-types/concerns/gyro-e/priceImpact.concern';
import { GyroEJoinConcern } from '@/modules/pools/pool-types/concerns/gyro-e/join.concern';

export class GyroE implements PoolType {
  constructor(
    public exit: ExitConcern = new GyroEExitConcern(),
    public liquidity: LiquidityConcern = new GyroELiquidityConcern(),
    public spotPriceCalculator: SpotPriceConcern = new GyroESpotPriceConcern(),
    public priceImpactCalculator: PriceImpactConcern = new GyroEPriceImpactConcern(),
    public join: JoinConcern = new GyroEJoinConcern()
  ) {}
}
