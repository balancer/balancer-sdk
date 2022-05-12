import { BalancerSdkConfig } from '@/types';
import { Stable } from './pool-types/stable.module';
import { Weighted } from './pool-types/weighted.module';
import { MetaStable } from './pool-types/metaStable.module';
import { StablePhantom } from './pool-types/stablePhantom.module';
import { Linear } from './pool-types/linear.module';

export class Pools {
    constructor(
        config: BalancerSdkConfig,
        public weighted = new Weighted(),
        public stable = new Stable(),
        public metaStable = new MetaStable(),
        public stablePhantom = new StablePhantom(),
        public linear = new Linear()
    ) {}
}
