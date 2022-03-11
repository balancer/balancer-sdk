import { BalancerSdkConfig } from '@/types';
import { Stable } from './pool-types/stable.module';
import { Weighted } from './pool-types/weighted.module';

export class Pools {
    constructor(
        config: BalancerSdkConfig,
        public weighted = new Weighted(),
        public stable = new Stable()
    ) {}
}
