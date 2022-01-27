import { BalancerNetworkConfig, BalancerSdkConfig } from '../types';
import { Swaps } from './swaps/swaps.module';
import { Relayer } from './relayer/relayer.module';
import { SOR } from '@balancer-labs/sor';
import { SorFactory } from '../sor/sorFactory';
import { BALANCER_NETWORK_CONFIG } from '@/lib/constants/contracts';
import { JsonRpcProvider, Provider } from '@ethersproject/providers';
import { createSubgraphClient, SubgraphClient } from '../subgraph/subgraph';

export class BalancerSDK {
    public readonly network: BalancerNetworkConfig;
    public readonly rpcUrl: string;
    public readonly swaps: Swaps;
    public readonly relayer: Relayer;
    public readonly sor: SOR;
    public readonly provider: Provider;
    public readonly subgraphClient: SubgraphClient;

    constructor(config: BalancerSdkConfig) {
        this.network = this.getNetworkConfig(config);
        this.rpcUrl = config.rpcUrl;
        this.provider = new JsonRpcProvider(this.rpcUrl);
        this.subgraphClient = createSubgraphClient(this.network.subgraphUrl);

        this.sor = SorFactory.createSor(
            this.network,
            config,
            this.provider,
            this.subgraphClient
        );

        this.swaps = new Swaps(this.network, this.sor, this.provider);
        this.relayer = new Relayer(this.swaps);
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
}
