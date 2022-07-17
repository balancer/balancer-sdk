import dotenv from 'dotenv';
import { expect } from 'chai';
import { BalancerSdkConfig, Network, BalancerSDK } from '@/.';
import { Zaps } from './zaps.module';

dotenv.config();

const sdkConfig: BalancerSdkConfig = {
  network: Network.MAINNET,
  rpcUrl: `https://mainnet.infura.io/v3/${process.env.INFURA}`,
};

describe('zaps module', () => {
  context('instantiation', () => {
    it('instantiate via module', async () => {
      const zaps = new Zaps(sdkConfig);
      expect(zaps.config.network).to.deep.eq(Network.MAINNET);
    });

    it('instantiate via SDK', async () => {
      const balancer = new BalancerSDK(sdkConfig);
      expect(balancer.zaps.config.network).to.deep.eq(Network.MAINNET);
    });
  });
});
