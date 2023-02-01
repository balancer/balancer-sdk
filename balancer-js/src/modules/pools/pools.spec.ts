import { Pools } from './index';
import { getNetworkConfig } from '../sdk.helpers';
import { factories } from '@/test/factories';
import { expect } from 'chai';

const pools = new Pools(
  getNetworkConfig({ network: 1, rpcUrl: '' }),
  factories.data.repositores({})
);

describe('Pool services', () => {
  context('proportional amounts', () => {
    it('should expose the service', () => {
      expect(pools.proportionalAmounts).to.be.a('function');
    });
  });
});
