import {
    BalancerNetworkConfig,
    BalancerSdkConfig,
    BalancerSdkSorConfig,
} from '../types';
import { SwapsService } from '../swapsService';
import { RelayerService } from '../relayerService';
import { SOR } from '@balancer-labs/sor';
import { SorFactory } from '../sor/sorFactory';
import { BALANCER_NETWORK_CONFIG } from '../constants/contracts';
import { JsonRpcProvider, Provider } from '@ethersproject/providers';
import { createSubgraphClient, SubgraphClient } from '../subgraph/subgraph';

export class BalancerSDK {
    public readonly network: BalancerNetworkConfig;
    public readonly rpcUrl: string;
    public readonly swaps: SwapsService;
    public readonly relayer: RelayerService;
    public readonly sor: SOR;
    public readonly provider: Provider;
    public readonly subgraphClient: SubgraphClient;

    constructor(config: BalancerSdkConfig) {
        this.network = this.getNetworkConfig(config);
        this.rpcUrl = config.rpcUrl;
        this.provider = new JsonRpcProvider(this.rpcUrl);
        this.subgraphClient = createSubgraphClient(this.network.subgraphUrl);

        const sorConfig = this.getSorConfig(config);
        this.sor = SorFactory.createSor(
            this.network,
            sorConfig,
            this.provider,
            this.subgraphClient
        );

        this.swaps = new SwapsService(this.network, this.sor, this.provider);
        this.relayer = new RelayerService(this.swaps, this.rpcUrl);
    }

    private getNetworkConfig(config: BalancerSdkConfig): BalancerNetworkConfig {
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

    private getSorConfig(config: BalancerSdkConfig): BalancerSdkSorConfig {
        return {
            tokenPriceService: 'coingecko',
            poolDataService: 'subgraph',
            fetchOnChainBalances: true,
            ...config.sor,
        };
    }
}
