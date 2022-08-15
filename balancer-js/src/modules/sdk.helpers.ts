import { BALANCER_NETWORK_CONFIG } from '@/lib/constants/config';
import {
  BalancerDataRepositories,
  BalancerNetworkConfig,
  BalancerSdkConfig,
} from '@/types';
import {
  CoingeckoPriceRepository,
  LiquidityGaugeSubgraphRPCProvider,
  PoolsSubgraphRepository,
  StaticTokenProvider,
  FeeDistributorRepository,
  FeeCollectorRepository,
  TokenYieldsRepository,
} from './data';
import { Sor } from './sor/sor.module';

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

export function getDataRepositories(
  config: BalancerSdkConfig
): BalancerDataRepositories {
  const networkConfig = getNetworkConfig(config);
  const sor = new Sor(config);
  const repositories = {
    pools: new PoolsSubgraphRepository(networkConfig.urls.subgraph),
    tokenPrices: new CoingeckoPriceRepository([], networkConfig.chainId),
    tokenMeta: new StaticTokenProvider([]),
    liquidityGauges: new LiquidityGaugeSubgraphRPCProvider(
      networkConfig.urls.gaugesSubgraph,
      networkConfig.addresses.contracts.multicall,
      networkConfig.addresses.contracts.gaugeController,
      sor.provider
    ),
    feeDistributor: new FeeDistributorRepository(
      networkConfig.addresses.contracts.multicall,
      networkConfig.addresses.contracts.feeDistributor,
      networkConfig.addresses.tokens.bal,
      networkConfig.addresses.tokens.veBal,
      networkConfig.addresses.tokens.bbaUsd,
      sor.provider
    ),
    feeCollector: new FeeCollectorRepository(
      networkConfig.addresses.contracts.vault,
      sor.provider
    ),
    tokenYields: new TokenYieldsRepository(),
  };
  return repositories;
}
