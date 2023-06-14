import { JsonRpcProvider } from '@ethersproject/providers';
import { expect } from 'chai';
import { BalancerSDK, Network } from '@/.';
import { Contracts } from './contracts.module';

let sdkConfig = {
  network: 1,
  rpcUrl: `https://rpc.ankr.com/eth`,
};

describe('contracts module Mainnet', () => {
  before(() => {
    sdkConfig = {
      network: 1,
      rpcUrl: `https://rpc.ankr.com/eth`,
    };
  });

  context('instantiation', () => {
    it('instantiate via module with provider', async () => {
      const provider = new JsonRpcProvider(sdkConfig.rpcUrl);
      const contracts = new Contracts(sdkConfig.network, provider);
      const vaultContract = contracts.contracts['vault'];
      expect(vaultContract.address).to.eq(
        '0xba12222222228d8ba445958a75a0704d566bf2c8'
      );
      const gaugeClaimHelperContract = contracts.contracts['gaugeClaimHelper'];
      expect(gaugeClaimHelperContract).to.be.undefined;
    });

    it('instantiate via SDK', async () => {
      const balancer = new BalancerSDK(sdkConfig);
      const vaultContract = balancer.contracts['vault'];
      expect(vaultContract.address).to.eq(
        '0xba12222222228d8ba445958a75a0704d566bf2c8'
      );
      const gaugeClaimHelperContract = balancer.contracts['gaugeClaimHelper'];
      expect(gaugeClaimHelperContract).to.be.undefined;
    });
  });
});

describe('contracts module Polygon', () => {
  before(() => {
    sdkConfig = {
      network: 137,
      rpcUrl: `https://rpc.ankr.com/polygon`,
    };
  });

  context('instantiation', () => {
    it('instantiate via module with provider', async () => {
      const provider = new JsonRpcProvider(sdkConfig.rpcUrl);
      const contracts = new Contracts(sdkConfig.network as Network, provider);
      const vaultContract = contracts.contracts['vault'];
      expect(vaultContract.address).to.eq(
        '0xba12222222228d8ba445958a75a0704d566bf2c8'
      );
      const gaugeClaimHelperContract = contracts.contracts['gaugeClaimHelper'];
      expect(gaugeClaimHelperContract?.address).to.eq(
        '0xaeb406b0e430bf5ea2dc0b9fe62e4e53f74b3a33'
      );
    });

    it('instantiate via SDK', async () => {
      const balancer = new BalancerSDK(sdkConfig);
      const vaultContract = balancer.contracts['vault'];
      expect(vaultContract.address).to.eq(
        '0xba12222222228d8ba445958a75a0704d566bf2c8'
      );

      const gaugeClaimHelperContract = balancer.contracts['gaugeClaimHelper'];
      expect(gaugeClaimHelperContract?.address).to.eq(
        '0xaeb406b0e430bf5ea2dc0b9fe62e4e53f74b3a33'
      );
    });
  });
});

describe('contracts module Arbitrum', () => {
  before(() => {
    sdkConfig = {
      network: 42161,
      rpcUrl: `https://rpc.ankr.com/arbitrum`,
    };
  });

  context('instantiation', () => {
    it('instantiate via module with provider', async () => {
      const provider = new JsonRpcProvider(sdkConfig.rpcUrl);
      const contracts = new Contracts(sdkConfig.network as Network, provider);
      const vaultContract = contracts.contracts['vault'];
      expect(vaultContract.address).to.eq(
        '0xba12222222228d8ba445958a75a0704d566bf2c8'
      );

      const gaugeClaimHelperContract = contracts.contracts['gaugeClaimHelper'];
      expect(gaugeClaimHelperContract?.address).to.eq(
        '0xa0dabebaad1b243bbb243f933013d560819eb66f'
      );
    });

    it('instantiate via SDK', async () => {
      const balancer = new BalancerSDK(sdkConfig);
      const vaultContract = balancer.contracts['vault'];
      expect(vaultContract.address).to.eq(
        '0xba12222222228d8ba445958a75a0704d566bf2c8'
      );

      const gaugeClaimHelperContract = balancer.contracts['gaugeClaimHelper'];
      expect(gaugeClaimHelperContract?.address).to.eq(
        '0xa0dabebaad1b243bbb243f933013d560819eb66f'
      );
    });
  });
});
