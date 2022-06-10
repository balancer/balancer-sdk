import dotenv from 'dotenv';
import { expect } from 'chai';
import { BalancerSdkConfig, Network, BalancerSDK } from '@/.';
import { Subgraph } from './subgraph.module';

dotenv.config();

const sdkConfig: BalancerSdkConfig = {
  network: Network.KOVAN,
  rpcUrl: `https://kovan.infura.io/v3/${process.env.INFURA}`,
  customSubgraphUrl: 'https://thegraph.com/custom-subgraph',
};

describe('subgraph module', () => {
  context('instantiation', () => {
    it('instantiate via module', async () => {
      const subgraph = new Subgraph(sdkConfig);
      expect(subgraph.url).to.eq('https://thegraph.com/custom-subgraph');
    });

    it('instantiate via SDK', async () => {
      const balancer = new BalancerSDK(sdkConfig);
      expect(balancer.subgraph.url).to.eq(
        'https://thegraph.com/custom-subgraph'
      );
    });
  });
});
