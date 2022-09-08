import dotenv from 'dotenv';
import { JsonRpcProvider } from '@ethersproject/providers';
import { expect } from 'chai';
import { BalancerSdkConfig, Network, BalancerSDK } from '@/.';
import { Contracts } from './contracts.module';

let sdkConfig: BalancerSdkConfig;

dotenv.config();

describe('contracts module', () => {
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
    }).timeout(20000);

    it('instantiate via SDK', async () => {
      const balancer = new BalancerSDK(sdkConfig);
      const vaultContract = balancer.contracts['vault'];
      expect(vaultContract.address).to.eq(
        '0xBA12222222228d8Ba445958a75a0704d566BF2C8'
      );
      const wethAddress = await vaultContract.WETH();
      expect(wethAddress).to.eq('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2');
    }).timeout(2e4);
  });
});
