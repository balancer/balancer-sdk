import { BalancerSdkConfig } from '@/types';
import { Subgraph } from '../subgraph/subgraph.module';
import { PoolData } from './modules/pool-data/pool-data.module';

export class Pools {
    public data: PoolData;

    constructor(config: BalancerSdkConfig) {
        const subgraph = new Subgraph(config);
        this.data = new PoolData(subgraph.client);
    }
}
