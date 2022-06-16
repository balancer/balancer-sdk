import { BALANCER_NETWORK_CONFIG } from '@/lib/constants/config';
import { BalancerNetworkConfig, BalancerSdkConfig } from '@/types';

export function getNetworkConfig(
  config: BalancerSdkConfig
): BalancerNetworkConfig {
  if (typeof config.network === 'number') {
    const networkConfig = BALANCER_NETWORK_CONFIG[config.network];

    return {
      ...networkConfig,
      urls: {
        ...networkConfig.urls,
        subgraph: config.customSubgraphUrl ?? networkConfig.urls.subgraph,
      },
    };
  }

  return {
    ...config.network,
    urls: {
      ...config.network.urls,
      subgraph: config.customSubgraphUrl ?? config.network.urls.subgraph,
    },
  };
}
