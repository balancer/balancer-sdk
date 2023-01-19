import dotenv from 'dotenv';
import { JsonRpcProvider } from '@ethersproject/providers';
import { expect } from 'chai';
import { BalancerSdkConfig, Network, BalancerSDK } from '@/.';
import { Contracts } from './contracts.module';

let sdkConfig: BalancerSdkConfig;

dotenv.config();

describe('contracts module Mainnet', () => {
  before(() => {
    sdkConfig = {
      network: Network.MAINNET,
      rpcUrl: `https://mainnet.infura.io/v3/${process.env.INFURA}`,
    };
  });

  context('instantiation', () => {
    it('instantiate via module with provider', async () => {
      const provider = new JsonRpcProvider(sdkConfig.rpcUrl);
      const contracts = new Contracts(sdkConfig.network as Network, provider);
      const vaultContract = contracts.contracts['vault'];
      expect(vaultContract.address).to.eq(
        '0xBA12222222228d8Ba445958a75a0704d566BF2C8'
      );
      const wethAddress = await vaultContract.WETH();
      expect(wethAddress).to.eq('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2');
      const gaugeClaimHelperContract = contracts.contracts['gaugeClaimHelper'];
      expect(gaugeClaimHelperContract).to.be.undefined;
    }).timeout(20000);

    it('instantiate via SDK', async () => {
      const balancer = new BalancerSDK(sdkConfig);
      const vaultContract = balancer.contracts['vault'];
      expect(vaultContract.address).to.eq(
        '0xBA12222222228d8Ba445958a75a0704d566BF2C8'
      );
      const wethAddress = await vaultContract.WETH();
      expect(wethAddress).to.eq('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2');
      const gaugeClaimHelperContract = balancer.contracts['gaugeClaimHelper'];
      expect(gaugeClaimHelperContract).to.be.undefined;
    }).timeout(2e4);
  });
});

describe('contracts module Polygon', () => {
  before(() => {
    sdkConfig = {
      network: Network.POLYGON,
      rpcUrl: `https://rpc.ankr.com/polygon`,
    };
  });

  context('instantiation', () => {
    it('instantiate via module with provider', async () => {
      const provider = new JsonRpcProvider(sdkConfig.rpcUrl);
      const contracts = new Contracts(sdkConfig.network as Network, provider);
      const vaultContract = contracts.contracts['vault'];
      expect(vaultContract.address).to.eq(
        '0xBA12222222228d8Ba445958a75a0704d566BF2C8'
      );
      const wethAddress = await vaultContract.WETH();
      expect(wethAddress).to.eq('0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270');

      const gaugeClaimHelperContract = contracts.contracts['gaugeClaimHelper'];
      expect(gaugeClaimHelperContract?.address).to.eq(
        '0xaeb406b0e430bf5ea2dc0b9fe62e4e53f74b3a33'
      );
    }).timeout(20000);

    it('instantiate via SDK', async () => {
      const balancer = new BalancerSDK(sdkConfig);
      const vaultContract = balancer.contracts['vault'];
      expect(vaultContract.address).to.eq(
        '0xBA12222222228d8Ba445958a75a0704d566BF2C8'
      );
      const wethAddress = await vaultContract.WETH();
      expect(wethAddress).to.eq('0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270');

      const gaugeClaimHelperContract = balancer.contracts['gaugeClaimHelper'];
      expect(gaugeClaimHelperContract?.address).to.eq(
        '0xaeb406b0e430bf5ea2dc0b9fe62e4e53f74b3a33'
      );
    }).timeout(2e4);
  });
});

describe('contracts module Arbitrum', () => {
  before(() => {
    sdkConfig = {
      network: Network.ARBITRUM,
      rpcUrl: `https://rpc.ankr.com/arbitrum`,
    };
  });

  context('instantiation', () => {
    it('instantiate via module with provider', async () => {
      const provider = new JsonRpcProvider(sdkConfig.rpcUrl);
      const contracts = new Contracts(sdkConfig.network as Network, provider);
      const vaultContract = contracts.contracts['vault'];
      expect(vaultContract.address).to.eq(
        '0xBA12222222228d8Ba445958a75a0704d566BF2C8'
      );
      const wethAddress = await vaultContract.WETH();
      expect(wethAddress).to.eq('0x82aF49447D8a07e3bd95BD0d56f35241523fBab1');

      const gaugeClaimHelperContract = contracts.contracts['gaugeClaimHelper'];
      expect(gaugeClaimHelperContract?.address).to.eq(
        '0xa0dabebaad1b243bbb243f933013d560819eb66f'
      );
    }).timeout(20000);

    it('instantiate via SDK', async () => {
      const balancer = new BalancerSDK(sdkConfig);
      const vaultContract = balancer.contracts['vault'];
      expect(vaultContract.address).to.eq(
        '0xBA12222222228d8Ba445958a75a0704d566BF2C8'
      );
      const wethAddress = await vaultContract.WETH();
      expect(wethAddress).to.eq('0x82aF49447D8a07e3bd95BD0d56f35241523fBab1');

      const gaugeClaimHelperContract = balancer.contracts['gaugeClaimHelper'];
      expect(gaugeClaimHelperContract?.address).to.eq(
        '0xa0dabebaad1b243bbb243f933013d560819eb66f'
      );
    }).timeout(2e4);
  });
});
