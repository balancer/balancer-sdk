import dotenv from 'dotenv';
import { expect } from 'chai';
import {
  BalancerSdkConfig,
  BalancerSdkSorConfig,
  Network,
  BalancerSDK,
} from '@/.';
import { Relayer } from './relayer.module';
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

describe('relayer module', () => {
  context('instantiation', () => {
    it('instantiate via module', async () => {
      const relayer = new Relayer(sdkConfig);
      await relayer.fetchPools();
      const pools = relayer.getPools();
      expect(pools).to.deep.eq([mockPool]);
    });

    it('instantiate via SDK', async () => {
      const balancer = new BalancerSDK(sdkConfig);

      await balancer.relayer.fetchPools();
      const pools = balancer.relayer.getPools();
      expect(pools).to.deep.eq([mockPool]);
    });
  });
});
