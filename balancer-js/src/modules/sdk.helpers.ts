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
      keys: {
        ...networkConfig.keys,
        tenderlyAccessKey: config.tenderlyAccessKey,
      },
    };
  }

  return {
    ...config.network,
    urls: {
      ...config.network.urls,
      subgraph: config.customSubgraphUrl ?? config.network.urls.subgraph,
    },
    keys: {
      ...config.network.keys,
      tenderlyAccessKey: config.tenderlyAccessKey,
    },
  };
}
