import { Pools } from './index';
import { getNetworkConfig } from '../sdk.helpers';
import { factories } from '@/test/factories';
import { expect } from 'chai';
import { Contracts } from '@/modules/contracts/contracts.module';
import { JsonRpcProvider } from '@ethersproject/providers';

const networkConfig = getNetworkConfig({ network: 1, rpcUrl: '' });

const pools = new Pools(
  networkConfig,
  factories.data.repositores({}),
  new Contracts(networkConfig.addresses.contracts, new JsonRpcProvider('', 1))
);

describe('Pool services', () => {
  context('proportional amounts', () => {
    it('should expose the service', () => {
      expect(pools.proportionalAmounts).to.be.a('function');
    });
  });
});
