import { expect } from 'chai';
import { Network, BalancerSDK } from '@/.';
import { Zaps } from './zaps.module';

const sdkConfig = {
  network: Network.MAINNET,
  rpcUrl: '',
};

describe('zaps module', () => {
  context('instantiation', () => {
    it('instantiate via module', async () => {
      const zaps = new Zaps(Network.MAINNET);
      expect(zaps.network).to.deep.eq(Network.MAINNET);
    });

    it('instantiate via SDK', async () => {
      const balancer = new BalancerSDK(sdkConfig);
      expect(balancer.zaps.network).to.deep.eq(Network.MAINNET);
    });
  });
});
