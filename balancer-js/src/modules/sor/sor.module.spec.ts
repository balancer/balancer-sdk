import dotenv from 'dotenv';
import { expect } from 'chai';
import {
  BalancerSdkConfig,
  BalancerSdkSorConfig,
  Network,
  BalancerSDK,
} from '@/.';
import { mockPool, mockPoolDataService } from '@/test/lib/mockPool';
import { Sor } from './sor.module';

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

describe('sor module', () => {
  context('instantiation', () => {
    it('instantiate via module', async () => {
      const sor = new Sor(sdkConfig);
      await sor.fetchPools();
      const pools = sor.getPools();
      expect(pools).to.deep.eq([mockPool]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const providerNetwork = (<any>sor.provider)['_network']['chainId'];
      expect(providerNetwork).to.eq(sdkConfig.network);
    });

    it('instantiate via SDK', async () => {
      const balancer = new BalancerSDK(sdkConfig);

      await balancer.sor.fetchPools();
      const pools = balancer.sor.getPools();
      expect(pools).to.deep.eq([mockPool]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const providerNetwork = (<any>balancer.sor.provider)['_network'][
        'chainId'
      ];
      expect(providerNetwork).to.eq(sdkConfig.network);
    });
  });
});
