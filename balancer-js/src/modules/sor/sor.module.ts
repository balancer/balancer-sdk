import { SOR, SorConfig, TokenPriceService } from '@balancer-labs/sor';
import { Provider, JsonRpcProvider } from '@ethersproject/providers';
import { SubgraphPoolDataService } from './pool-data/subgraphPoolDataService';
import { CoingeckoTokenPriceService } from './token-price/coingeckoTokenPriceService';
import {
  SubgraphClient,
  createSubgraphClient,
} from '@/modules/subgraph/subgraph';
import {
  BalancerNetworkConfig,
  BalancerSdkConfig,
  BalancerSdkSorConfig,
} from '@/types';
import { SubgraphTokenPriceService } from './token-price/subgraphTokenPriceService';
import { getNetworkConfig } from '@/modules/sdk.helpers';
import { POOLS_TO_IGNORE } from '@/lib/constants/poolsToIgnore';

export class Sor extends SOR {
  constructor(sdkConfig: BalancerSdkConfig) {
    const network = getNetworkConfig(sdkConfig);
    const sorConfig = Sor.getSorConfig(sdkConfig);
    const sorNetworkConfig = Sor.getSorNetworkConfig(network);
    const provider = new JsonRpcProvider(
      sdkConfig.rpcUrl,
      sdkConfig.network as number
    );
    const subgraphClient = createSubgraphClient(network.urls.subgraph);

    const poolDataService = Sor.getPoolDataService(
      network,
      sorConfig,
      provider,
      subgraphClient
    );

    const tokenPriceService = Sor.getTokenPriceService(
      network,
      sorConfig,
      subgraphClient
    );

    super(provider, sorNetworkConfig, poolDataService, tokenPriceService);
  }

  private static getSorConfig(config: BalancerSdkConfig): BalancerSdkSorConfig {
    return {
      tokenPriceService: 'coingecko',
      poolDataService: 'subgraph',
      fetchOnChainBalances: true,
      ...config.sor,
    };
  }

  private static getSorNetworkConfig(
    network: BalancerNetworkConfig
  ): SorConfig {
    return {
      ...network,
      vault: network.addresses.contracts.vault,
      weth: network.addresses.tokens.wrappedNativeAsset,
      lbpRaisingTokens: network.addresses.tokens?.lbpRaisingTokens,
      wETHwstETH: network.pools.wETHwstETH,
      connectingTokens: network.sorConnectingTokens,
      triPathMidPoolIds: network.sorTriPathMidPoolIds,
    };
  }

  private static getPoolDataService(
    network: BalancerNetworkConfig,
    sorConfig: BalancerSdkSorConfig,
    provider: Provider,
    subgraphClient: SubgraphClient
  ) {
    // For SOR we want to ignore all configured pools (for Vault/Simulation we don't)
    const allPoolsToIgnore = [
      ...(network.poolsToIgnore ?? []),
      ...POOLS_TO_IGNORE,
    ];
    return typeof sorConfig.poolDataService === 'object'
      ? sorConfig.poolDataService
      : new SubgraphPoolDataService(
          subgraphClient,
          provider,
          { ...network, poolsToIgnore: allPoolsToIgnore },
          sorConfig
        );
  }

  private static getTokenPriceService(
    network: BalancerNetworkConfig,
    sorConfig: BalancerSdkSorConfig,
    subgraphClient: SubgraphClient
  ): TokenPriceService {
    if (typeof sorConfig.tokenPriceService === 'object') {
      return sorConfig.tokenPriceService;
    } else if (sorConfig.tokenPriceService === 'subgraph') {
      new SubgraphTokenPriceService(
        subgraphClient,
        network.addresses.tokens.wrappedNativeAsset
      );
    }

    return new CoingeckoTokenPriceService(network.chainId);
  }
}
