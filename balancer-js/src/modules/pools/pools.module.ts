import { BalancerSdkConfig } from '@/types';
import { Stable } from './pool-types/stable.module';
import { Weighted } from './pool-types/weighted.module';
import { MetaStable } from './pool-types/metaStable.module';
import { StablePhantom } from './pool-types/stablePhantom.module';
import { Linear } from './pool-types/linear.module';
import { SubgraphPoolBase } from '@balancer-labs/sor';
import { BalancerError, BalancerErrorCode } from '@/balancerErrors';
import { PoolInfo } from './types';
import { BigNumber } from 'ethers';

export class Pools {
  config: BalancerSdkConfig;
  public weighted: Weighted;
  public stable: Stable;
  public metaStable: MetaStable;
  public stablePhantom: StablePhantom;
  public linear: Linear;
  static config: BalancerSdkConfig;

  constructor(
    config: BalancerSdkConfig,
  ) {
    this.config = config;
    this.weighted = new Weighted(this.config);
    this.stable = new Stable();
    this.metaStable = new MetaStable();
    this.stablePhantom = new StablePhantom();
    this.linear = new Linear();
  }

  static from(
    pool: SubgraphPoolBase
  ): Weighted | Stable | MetaStable | StablePhantom | Linear {
    // Calculate spot price using pool type
    switch (pool.poolType) {
      case 'Weighted':
      case 'Investment':
      case 'LiquidityBootstrapping': {
        return new Weighted(this.config);
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

  getPoolInfoFromCreateTx(tx: any): Promise<PoolInfo> {
      return new Promise((resolve, reject) => {
        resolve({ id: BigNumber.from('0'), address: "0x000000000000000000000000000000", name: '' })
        reject('No contract created in that transaction')
      })
  }
}
