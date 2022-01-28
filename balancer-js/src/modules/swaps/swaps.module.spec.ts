import dotenv from 'dotenv';
import { expect } from 'chai';

import {
    BalancerSdkConfig,
    BalancerSdkSorConfig,
    Network,
    BalancerSDK,
    Swaps,
} from '@/.';
import { mockPool, mockPoolDataService } from '@/test/lib/mockPool';

dotenv.config();

const sorConfig: BalancerSdkSorConfig = {
    tokenPriceService: 'coingecko',
    poolDataService: mockPoolDataService,
    fetchOnChainBalances: false,
};

const sdkConfig: BalancerSdkConfig = {
    network: Network.KOVAN,
    rpcUrl: `https://kovan.infura.io/v3/${process.env.INFURA}`,
    sor: sorConfig,
};

describe('swaps module', () => {
    context('instantiation', () => {
        it('instantiate via module', async () => {
            const swaps = new Swaps(sdkConfig);
            await swaps.fetchPools();
            const pools = swaps.getPools();
            expect(pools).to.deep.eq([mockPool]);
        });

        it('instantiate via SDK', async () => {
            const balancer = new BalancerSDK(sdkConfig);
            await balancer.swaps.fetchPools();
            const pools = balancer.swaps.getPools();
            expect(pools).to.deep.eq([mockPool]);
        });
    });
});
