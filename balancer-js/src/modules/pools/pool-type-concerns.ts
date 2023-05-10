import { BalancerSdkConfig, PoolType } from '@/types';
import { Stable } from './pool-types/stable.module';
import { ComposableStable } from './pool-types/composableStable.module';
import { Weighted } from './pool-types/weighted.module';
import { MetaStable } from './pool-types/metaStable.module';
import { StablePhantom } from './pool-types/stablePhantom.module';
import { Linear } from './pool-types/linear.module';
import { BalancerError, BalancerErrorCode } from '@/balancerErrors';
import { isLinearish } from '@/lib/utils';
import { FX } from '@/modules/pools/pool-types/fx.module';
import { Gyro } from '@/modules/pools/pool-types/gyro.module';

/**
 * Wrapper around pool type specific methods.
 *
 * Returns a class instance of a type specific method handlers.
 */
export class PoolTypeConcerns {
  constructor(
    config: BalancerSdkConfig,
    public weighted = new Weighted(),
    public stable = new Stable(),
    public composableStable = new ComposableStable(),
    public metaStable = new MetaStable(),
    public stablePhantom = new StablePhantom(),
    public linear = new Linear()
  ) {}

  static from(
    poolType: PoolType
  ):
    | Weighted
    | Stable
    | ComposableStable
    | MetaStable
    | StablePhantom
    | Linear {
    // Calculate spot price using pool type
    switch (poolType) {
      case 'ComposableStable': {
        return new ComposableStable();
      }
      case 'FX': {
        return new FX();
      }
      case 'GyroE':
      case 'Gyro2':
      case 'Gyro3': {
        return new Gyro();
      }
      case 'MetaStable': {
        return new MetaStable();
      }
      case 'Stable': {
        return new Stable();
      }
      case 'StablePhantom': {
        return new StablePhantom();
      }
      case 'Investment':
      case 'LiquidityBootstrapping':
      case 'Weighted': {
        return new Weighted();
      }
      default: {
        // Handles all Linear pool types
        if (isLinearish(poolType)) return new Linear();
        throw new BalancerError(BalancerErrorCode.UNSUPPORTED_POOL_TYPE);
      }
    }
  }
}
