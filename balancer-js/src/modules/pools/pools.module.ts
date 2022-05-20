import { BalancerSdkConfig } from '@/types';
import { Stable } from './pool-types/stable.module';
import { Weighted } from './pool-types/weighted.module';
import { MetaStable } from './pool-types/metaStable.module';
import { StablePhantom } from './pool-types/stablePhantom.module';
import { Linear } from './pool-types/linear.module';
import { SOR, SubgraphPoolBase } from '@balancer-labs/sor';
import { BalancerError, BalancerErrorCode } from '@/balancerErrors';

import { Sor } from '../sor/sor.module';
import { JoinConcern } from './pool-types/concerns/types';

export class Pools {
    private readonly sor: Sor;

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
                throw new BalancerError(
                    BalancerErrorCode.UNSUPPORTED_POOL_TYPE
                );
        }
    }

    /**
     * fetchPools saves updated pools data to SOR internal onChainBalanceCache.
     * @param {SubgraphPoolBase[]} [poolsData=[]] If poolsData passed uses this as pools source otherwise fetches from config.subgraphUrl.
     * @param {boolean} [isOnChain=true] If isOnChain is true will retrieve all required onChain data via multicall otherwise uses subgraph values.
     * @returns {boolean} Boolean indicating whether pools data was fetched correctly (true) or not (false).
     */
    async fetchPools(): Promise<boolean> {
        return this.sor.fetchPools();
    }

    public getPools(): SubgraphPoolBase[] {
        return this.sor.getPools();
    }

    /**
     * exactTokensJoinPool Joins user to desired pool with exact tokens in and minimum BPT out based on slippage tolerance
     * @param {string} joiner - Address used to join pool.
     * @param {string} poolId - Id of pool being joined.
     * @param {string[]} tokensIn - Array containing addresses of tokens to provide for joining pool. (must have same length and order as amountsIn)
     * @param {string[]} amountsIn - Array containing amounts of tokens to provide for joining pool. (must have same length and order as tokensIn)
     * @param {string} slippage - Slippage to be applied to swap section. i.e. 5%=50000000000000000.
     * @returns String with encoded transaction data.
     */
    async exactTokensJoinPool(
        joiner: string,
        poolId: string,
        tokensIn: string[],
        amountsIn: string[],
        slippage: string
    ): Promise<string> {
        const poolsFetched = await this.fetchPools();
        if (!poolsFetched)
            throw new BalancerError(BalancerErrorCode.NO_POOL_DATA); // TODO: review this later
        const pools = this.getPools();
        const pool = pools.find(
            (p) => p.id.toLowerCase() === poolId.toLowerCase()
        );
        if (!pool) throw new BalancerError(BalancerErrorCode.POOL_DOESNT_EXIST);

        let joinCalculator: JoinConcern;

        // Calculate spot price using pool type
        switch (pool.poolType) {
            case 'Weighted':
            case 'Investment':
            case 'LiquidityBootstrapping': {
                joinCalculator = this.weighted.joinCalculator;
                break;
            }
            case 'Stable': {
                joinCalculator = this.stable.joinCalculator;
                break;
            }
            case 'MetaStable': {
                joinCalculator = this.metaStable.joinCalculator;
                break;
            }
            case 'StablePhantom': {
                joinCalculator = this.stablePhantom.joinCalculator;
                break;
            }
            case 'AaveLinear':
            case 'ERC4626Linear': {
                joinCalculator = this.linear.joinCalculator;
                break;
            }
            default:
                throw new BalancerError(
                    BalancerErrorCode.UNSUPPORTED_POOL_TYPE
                );
        }

        return joinCalculator.exactTokensJoinPool(
            joiner,
            pool,
            tokensIn,
            amountsIn,
            slippage
        );
    }
}
