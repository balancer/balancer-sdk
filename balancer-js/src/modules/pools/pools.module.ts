import { BalancerSdkConfig } from '@/types';
import { Stable } from './pool-types/stable.module';
import { Weighted } from './pool-types/weighted.module';
import { MetaStable } from './pool-types/metaStable.module';
import { StablePhantom } from './pool-types/stablePhantom.module';
import { Linear } from './pool-types/linear.module';
import { SubgraphPoolBase } from '@balancer-labs/sor';
import { BalancerError, BalancerErrorCode } from '@/balancerErrors';
import { PoolInfo } from './types';
import { BigNumber, ethers, Signer } from 'ethers';
import { WeightedPoolFactory__factory } from '@balancer-labs/typechain';
import { poolFactoryAddresses } from '@/lib/constants/config';
import { TypedEventFilter } from '@balancer-labs/typechain/dist/commons';

export class Pools {
  constructor(
    config: BalancerSdkConfig,
    public weighted = new Weighted(),
    public stable = new Stable(),
    public metaStable = new MetaStable(),
    public stablePhantom = new StablePhantom(),
    public linear = new Linear()
  ) {}

  static from(
    pool: SubgraphPoolBase
  ): Weighted | Stable | MetaStable | StablePhantom | Linear {
    // Calculate spot price using pool type
    switch (pool.poolType) {
      case 'Weighted':
      case 'Investment':
      case 'LiquidityBootstrapping': {
        return new Weighted();
      }
      case 'Stable': {
        return new Stable();
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

  getPoolInfoFilter(): (string | string[])[] {
    const wPoolFactory = WeightedPoolFactory__factory.createInterface();
    const filterTopics = wPoolFactory.encodeFilterTopics(
      wPoolFactory.events['PoolCreated(address)'],
      []
    );

    return filterTopics;
  }
}
