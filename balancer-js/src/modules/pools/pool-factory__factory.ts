import { PoolType } from '@/types';
import { ComposableStableFactory } from '@/modules/pools/factory/composable-stable/composable-stable.factory';
import { BalancerError, BalancerErrorCode } from '@/balancerErrors';
import { PoolFactory } from '@/modules/pools/factory/pool-factory';

/**
 * Wrapper around pool type specific methods.
 *
 * Returns a class instance of a type specific factory.
 */
export class PoolFactory__factory {
  of(poolType: PoolType): PoolFactory {
    switch (poolType) {
      case 'Weighted':
      case 'Investment':
      case 'LiquidityBootstrapping': {
        throw new BalancerError(BalancerErrorCode.UNSUPPORTED_POOL_TYPE);
      }
      case 'Stable': {
        throw new BalancerError(BalancerErrorCode.UNSUPPORTED_POOL_TYPE);
      }
      case 'ComposableStable': {
        return new ComposableStableFactory();
      }
      case 'MetaStable': {
        throw new BalancerError(BalancerErrorCode.UNSUPPORTED_POOL_TYPE);
      }
      case 'StablePhantom': {
        throw new BalancerError(BalancerErrorCode.UNSUPPORTED_POOL_TYPE);
      }
      case 'AaveLinear':
      case 'ERC4626Linear': {
        throw new BalancerError(BalancerErrorCode.UNSUPPORTED_POOL_TYPE);
      }
      default:
        throw new BalancerError(BalancerErrorCode.UNSUPPORTED_POOL_TYPE);
    }
  }
}
