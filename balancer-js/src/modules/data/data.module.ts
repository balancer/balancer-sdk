import { BalancerSdkConfig } from '@/types';

class Data {
    constructor(
        private config: BalancerSdkConfig,
        private provider: DataProvider = new DefaultDataProvider(config)
    ) {}
}
