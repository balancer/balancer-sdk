import { PoolType } from './pool-type.interface';
import {
  ExitConcern,
  JoinConcern,
  LiquidityConcern,
  PriceImpactConcern,
  SpotPriceConcern,
} from '@/modules/pools/pool-types/concerns/types';
import { GyroExitConcern } from '@/modules/pools/pool-types/concerns/gyro/exit.concern';
import { GyroLiquidityConcern } from '@/modules/pools/pool-types/concerns/gyro/liquidity.concern';
import { GyroSpotPriceConcern } from '@/modules/pools/pool-types/concerns/gyro/spotPrice.concern';
import { GyroPriceImpactConcern } from '@/modules/pools/pool-types/concerns/gyro/priceImpact.concern';
import { GyroJoinConcern } from '@/modules/pools/pool-types/concerns/gyro/join.concern';

export class Gyro implements PoolType {
  constructor(
    public exit: ExitConcern = new GyroExitConcern(),
    public liquidity: LiquidityConcern = new GyroLiquidityConcern(),
    public spotPriceCalculator: SpotPriceConcern = new GyroSpotPriceConcern(),
    public priceImpactCalculator: PriceImpactConcern = new GyroPriceImpactConcern(),
    public join: JoinConcern = new GyroJoinConcern()
  ) {}
}
