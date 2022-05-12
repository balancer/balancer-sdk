import { BalancerSdkConfig } from '@/types';
import { Stable } from './pool-types/stable.module';
import { Weighted } from './pool-types/weighted.module';
import { MetaStable } from './pool-types/metaStable.module';
import { StablePhantom } from './pool-types/stablePhantom.module';
import { Linear } from './pool-types/linear.module';
import { SubgraphPoolBase } from '@balancer-labs/sor';
import { BalancerError, BalancerErrorCode } from '@/balancerErrors';

export class Pools {
    constructor(
        config: BalancerSdkConfig,
        public weighted = new Weighted(),
        public stable = new Stable(),
        public metaStable = new MetaStable(),
        public stablePhantom = new StablePhantom(),
        public linear = new Linear()
    ) {}

    static find(
        id: string,
        pools: SubgraphPoolBase[]
    ): Weighted | Stable | MetaStable | StablePhantom | Linear {
        // Find pool of interest from pools list
        const pool = pools.find((p) => p.id.toLowerCase() === id.toLowerCase());
        if (!pool) throw new BalancerError(BalancerErrorCode.POOL_DOESNT_EXIST);

        // Calculate spot price using pool type
        switch (pool.poolType) {
            case 'Weighted':
            case 'Investment':
            case 'LiquidityBootstrapping': {
                return new Weighted(pool);
            }
            case 'Stable': {
                return new Stable(pool);
            }
            case 'MetaStable': {
                return new MetaStable(pool);
            }
            case 'StablePhantom': {
                return new StablePhantom(pool);
            }
            case 'AaveLinear':
            case 'ERC4626Linear': {
                return new Linear(pool);
            }
            default:
                throw new BalancerError(
                    BalancerErrorCode.UNSUPPORTED_POOL_TYPE
                );
        }
    }
}
