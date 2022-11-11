import { BalancerSdkConfig, PoolType } from '@/types';
import { Stable } from './pool-types/stable.module';
import { ComposableStable } from './pool-types/composableStable.module';
import { Weighted } from './pool-types/weighted.module';
import { MetaStable } from './pool-types/metaStable.module';
import { StablePhantom } from './pool-types/stablePhantom.module';
import { Linear } from './pool-types/linear.module';
import { BalancerError, BalancerErrorCode } from '@/balancerErrors';

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
      case 'Weighted':
      case 'Investment':
      case 'LiquidityBootstrapping': {
        return new Weighted();
      }
      case 'Stable': {
        return new Stable();
      }
      case 'HighAmpComposableStable':
      case 'ComposableStable': {
        return new ComposableStable();
      }
      case 'MetaStable': {
        return new MetaStable();
      }
      case 'StablePhantom': {
        return new StablePhantom();
      }
      case 'AaveLinear':
      case 'ERC4626Linear': {
        return new Linear();
      }
      default:
        throw new BalancerError(BalancerErrorCode.UNSUPPORTED_POOL_TYPE);
    }
  }
}
