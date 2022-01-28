import dotenv from 'dotenv';
import { expect } from 'chai';
import {
    BalancerSdkConfig,
    BalancerSdkSorConfig,
    Network,
    BalancerSDK,
} from '@/.';
import { SorFactory } from '@/sor/sorFactory';
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

describe('sorFactory', () => {
    context('createSor', () => {
        it('instantiate via module', async () => {
            const sor = SorFactory.createSor(sdkConfig);
            await sor.fetchPools();
            const pools = sor.getPools();
            expect(pools).to.deep.eq([mockPool]);
            const providerNetwork = await sor.provider.getNetwork();
            expect(providerNetwork.chainId).to.eq(sdkConfig.network);
        });

        it('instantiate via SDK', async () => {
            const balancer = new BalancerSDK(sdkConfig);

            await balancer.sor.fetchPools();
            const pools = balancer.sor.getPools();
            expect(pools).to.deep.eq([mockPool]);
            const providerNetwork = await balancer.sor.provider.getNetwork();
            expect(providerNetwork.chainId).to.eq(sdkConfig.network);
        });
    });
});
