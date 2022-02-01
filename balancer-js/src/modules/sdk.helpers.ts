import { BALANCER_NETWORK_CONFIG } from '@/lib/constants/contracts';
import { BalancerNetworkConfig, BalancerSdkConfig } from '@/types';

export function getNetworkConfig(
    config: BalancerSdkConfig
): BalancerNetworkConfig {
    if (typeof config.network === 'number') {
        const networkConfig = BALANCER_NETWORK_CONFIG[config.network];

        return {
            ...networkConfig,
            subgraphUrl: config.customSubgraphUrl ?? networkConfig.subgraphUrl,
        };
    }

    return {
        ...config.network,
        subgraphUrl: config.customSubgraphUrl ?? config.network.subgraphUrl,
    };
}
