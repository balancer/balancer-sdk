import { BalancerSdkConfig } from '../types';
import { Swaps } from './swaps/swaps.module';
import { Relayer } from './relayer/relayer.module';
import { SOR } from '@balancer-labs/sor';
import { SorFactory } from './sor/sorFactory';
import { BalancerNetworkConfig } from '..';
import { BALANCER_NETWORK_CONFIG } from '@/lib/constants/contracts';
import { Subgraph } from './subgraph/subgraph.module';

export class BalancerSDK {
    public readonly swaps: Swaps;
    public readonly relayer: Relayer;
    public readonly sor: SOR;
    public readonly subgraph: Subgraph;

    constructor(config: BalancerSdkConfig) {
        this.sor = SorFactory.createSor(config);
        this.subgraph = new Subgraph(config);
        this.swaps = new Swaps(this.sor);
        this.relayer = new Relayer(this.swaps);
    }

    public static getNetworkConfig(
        config: BalancerSdkConfig
    ): BalancerNetworkConfig {
        if (typeof config.network === 'number') {
            const networkConfig = BALANCER_NETWORK_CONFIG[config.network];

            return {
                ...networkConfig,
                subgraphUrl:
                    config.customSubgraphUrl ?? networkConfig.subgraphUrl,
            };
        }

        return {
            ...config.network,
            subgraphUrl: config.customSubgraphUrl ?? config.network.subgraphUrl,
        };
    }
}
