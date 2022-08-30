import { BALANCER_NETWORK_CONFIG } from '@/lib/constants/config';
import {
  BalancerDataRepositories,
  BalancerNetworkConfig,
  BalancerSdkConfig,
} from '@/types';
import {
  BlockNumberRepository,
  CoingeckoPriceRepository,
  LiquidityGaugeSubgraphRPCProvider,
  PoolsSubgraphRepository,
  StaticTokenProvider,
  FeeDistributorRepository,
  FeeCollectorRepository,
  TokenYieldsRepository,
} from './data';
import { Sor } from './sor/sor.module';
import initialCoingeckoList from '@/modules/data/token-prices/initial-list.json';

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
  const blockDayAgo = () => {
    return new BlockNumberRepository(
      networkConfig.urls.blockNumberSubgraph || ''
    ).find('dayAgo');
  };
  // const tokenAddresses = [];
  const tokenAddresses = initialCoingeckoList
    .filter((t) => t.chainId == networkConfig.chainId)
    .map((t) => t.address);
  const sor = new Sor(config);
  const repositories = {
    pools: new PoolsSubgraphRepository(networkConfig.urls.subgraph),
    yesterdaysPools: new PoolsSubgraphRepository(
      networkConfig.urls.subgraph,
      blockDayAgo
    ),
    tokenPrices: new CoingeckoPriceRepository(
      tokenAddresses,
      networkConfig.chainId
    ),
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
