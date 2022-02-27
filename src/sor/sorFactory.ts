import { SOR, TokenPriceService } from '@balancer-labs/sor';
import { Provider } from '@ethersproject/providers';
import { SubgraphPoolDataService } from './pool-data/subgraphPoolDataService';
import { CoingeckoTokenPriceService } from './token-price/coingeckoTokenPriceService';
import { SubgraphClient } from '../subgraph/subgraph';
import {
    BalancerNetworkConfig,
    BalancerSdkConfig,
    BalancerSdkSorConfig,
} from '../types';
import { SubgraphTokenPriceService } from './token-price/subgraphTokenPriceService';

export class SorFactory {
    public static createSor(
        network: BalancerNetworkConfig,
        sdkConfig: BalancerSdkConfig,
        provider: Provider,
        subgraphClient: SubgraphClient
    ): SOR {
        const sorConfig = SorFactory.getSorConfig(sdkConfig);

        const poolDataService = SorFactory.getPoolDataService(
            network,
            sorConfig,
            provider,
            subgraphClient
        );

        const tokenPriceService = SorFactory.getTokenPriceService(
            network,
            sorConfig,
            subgraphClient
        );

        return new SOR(provider, network, poolDataService, tokenPriceService);
    }

    private static getSorConfig(
        config: BalancerSdkConfig
    ): BalancerSdkSorConfig {
        return {
            tokenPriceService: 'coingecko',
            poolDataService: 'subgraph',
            fetchOnChainBalances: true,
            ...config.sor,
        };
    }

    private static getPoolDataService(
        network: BalancerNetworkConfig,
        sorConfig: BalancerSdkSorConfig,
        provider: Provider,
        subgraphClient: SubgraphClient
    ) {
        return typeof sorConfig.poolDataService === 'object'
            ? sorConfig.poolDataService
            : new SubgraphPoolDataService(
                  subgraphClient,
                  provider,
                  network,
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
            new SubgraphTokenPriceService(subgraphClient, network.weth);
        }

        return new CoingeckoTokenPriceService(network.chainId);
    }
}
