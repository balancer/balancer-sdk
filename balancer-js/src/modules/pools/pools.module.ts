import { BalancerSdkConfig } from '@/types';
import { Stable } from './pool-types/stable.module';
import { Weighted } from './pool-types/weighted.module';
import { MetaStable } from './pool-types/metaStable.module';
import { StablePhantom } from './pool-types/stablePhantom.module';
import { Linear } from './pool-types/linear.module';
import { SOR, SubgraphPoolBase } from '@balancer-labs/sor';
import { BalancerError, BalancerErrorCode } from '@/balancerErrors';
import { Join } from './join/join.module';
import { Sor } from '../sor/sor.module';
import { Exit } from './exit/exit.module';

export class Pools {
  private readonly sor: Sor;
  public readonly join: Join;
  public readonly exit: Exit;

  constructor(
    config: BalancerSdkConfig,
    sor?: SOR,
    public weighted = new Weighted(),
    public stable = new Stable(),
    public metaStable = new MetaStable(),
    public stablePhantom = new StablePhantom(),
    public linear = new Linear()
  ) {
    if (sor) {
      this.sor = sor;
    } else {
      this.sor = new Sor(config);
    }
    this.join = new Join(this);
    this.exit = new Exit(this);
  }

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

  /**
   * fetchPools saves updated pools data to SOR internal onChainBalanceCache.
   * @returns {boolean} Boolean indicating whether pools data was fetched correctly (true) or not (false).
   */
  async fetchPools(): Promise<boolean> {
    return this.sor.fetchPools();
  }

  public getPools(): SubgraphPoolBase[] {
    return this.sor.getPools();
  }

  public async findById(poolId: string): Promise<SubgraphPoolBase> {
    let _pools = this.getPools();
    if (!_pools.length) {
      const poolsFetched = await this.fetchPools();
      if (!poolsFetched)
        throw new BalancerError(BalancerErrorCode.NO_POOL_DATA); // TODO: check if this is the proper error to throw
      _pools = this.getPools();
    }
    const pool = _pools.find(
      (p) => p.id.toLowerCase() === poolId.toLowerCase()
    );
    if (!pool) throw new BalancerError(BalancerErrorCode.POOL_DOESNT_EXIST);
    return pool;
  }
}
