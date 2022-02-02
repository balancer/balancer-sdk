import { BalancerSdkConfig, BalancerNetworkConfig } from '@/types';
import { Swaps } from './swaps/swaps.module';
import { Relayer } from './relayer/relayer.module';
import { Subgraph } from './subgraph/subgraph.module';
import { Sor } from './sor/sor.module';
import { getNetworkConfig } from './sdk.helpers';

export class BalancerSDK {
    public readonly swaps: Swaps;
    public readonly relayer: Relayer;
    public readonly sor: Sor;
    public readonly subgraph: Subgraph;

    constructor(public config: BalancerSdkConfig) {
        this.sor = new Sor(this.config);
        this.subgraph = new Subgraph(this.config);
        this.swaps = new Swaps(this.sor);
        this.relayer = new Relayer(this.swaps);
    }

    public get networkConfig(): BalancerNetworkConfig {
        return getNetworkConfig(this.config);
    }
}
