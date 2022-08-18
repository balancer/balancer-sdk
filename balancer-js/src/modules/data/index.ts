export * as balEmissions from './bal/emissions';
export * from './gauge-controller/multicall';
export * from './liquidity-gauges';
export * from './pool';
export * from './token';
export * from './token-prices';
export * from './fee-distributor/repository';
export * from './fee-collector/repository';
export * from './token-yields/repository';
export * from './block-number';

import { BalancerNetworkConfig, BalancerDataRepositories } from '@/types';
import { PoolsSubgraphRepository } from './pool/subgraph';
import { BlockNumberRepository } from './block-number';
import { CoingeckoPriceRepository } from './token-prices/coingecko';
import { StaticTokenProvider } from './token/static';
import { LiquidityGaugeSubgraphRPCProvider } from './liquidity-gauges/provider';
import { FeeDistributorRepository } from './fee-distributor/repository';
import { FeeCollectorRepository } from './fee-collector/repository';
import { TokenYieldsRepository } from './token-yields/repository';
import { Provider } from '@ethersproject/providers';

// initialCoingeckoList are used to get the initial token list for coingecko
// TODO: we might want to replace that with what frontend is using
import initialCoingeckoList from '@/modules/data/token-prices/initial-list.json';

export class Data implements BalancerDataRepositories {
  pools;
  yesterdaysPools;
  tokenPrices;
  tokenMeta;
  liquidityGauges;
  feeDistributor;
  feeCollector;
  tokenYields;

  constructor(networkConfig: BalancerNetworkConfig, provider: Provider) {
    // Config data
    const blockDayAgo = () => {
      return new BlockNumberRepository(networkConfig.chainId).find('dayAgo');
    };
    const tokenAddresses = initialCoingeckoList
      .filter((t) => t.chainId == networkConfig.chainId)
      .map((t) => t.address);

    this.pools = new PoolsSubgraphRepository(networkConfig.urls.subgraph);

    // 🚨 yesterdaysPools is used to calculate swapFees accumulated over last 24 hours
    // TODO: find a better data source for that, eg: maybe DUNE once API is available
    this.yesterdaysPools = new PoolsSubgraphRepository(
      networkConfig.urls.subgraph,
      blockDayAgo
    );

    this.tokenPrices = new CoingeckoPriceRepository(
      tokenAddresses,
      networkConfig.chainId
    );

    this.tokenMeta = new StaticTokenProvider([]);

    this.liquidityGauges = new LiquidityGaugeSubgraphRPCProvider(
      networkConfig.urls.gaugesSubgraph,
      networkConfig.addresses.contracts.multicall,
      networkConfig.addresses.contracts.gaugeController,
      provider
    );

    this.feeDistributor = new FeeDistributorRepository(
      networkConfig.addresses.contracts.multicall,
      networkConfig.addresses.contracts.feeDistributor,
      networkConfig.addresses.tokens.bal,
      networkConfig.addresses.tokens.veBal,
      networkConfig.addresses.tokens.bbaUsd,
      provider
    );

    this.feeCollector = new FeeCollectorRepository(
      networkConfig.addresses.contracts.vault,
      provider
    );

    this.tokenYields = new TokenYieldsRepository();
  }
}
