import { BalancerSdkConfig, BalancerNetworkConfig } from '@/types';
import { Swaps } from './swaps/swaps.module';
import { Relayer } from './relayer/relayer.module';
import { Subgraph } from './subgraph/subgraph.module';
import { Sor } from './sor/sor.module';
import { getNetworkConfig } from './sdk.helpers';
import { Pools } from './pools/pools.module';

export class BalancerSDK {
    public readonly swaps: Swaps;
    public readonly relayer: Relayer;

    constructor(
        public config: BalancerSdkConfig,
        public sor = new Sor(config),
        public subgraph = new Subgraph(config),
        public pools = new Pools(config)
    ) {
        this.swaps = new Swaps(this.sor);
        this.relayer = new Relayer(this.swaps);
    }

    public get networkConfig(): BalancerNetworkConfig {
        return getNetworkConfig(this.config);
    }
}
