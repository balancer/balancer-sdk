import dotenv from 'dotenv';
import { expect } from 'chai';
import {
  BalancerSdkConfig,
  BalancerSdkSorConfig,
  Network,
  BalancerSDK,
} from '@/.';
import { Pricing } from './pricing.module';
import { MockPoolDataService } from '@/test/lib/mockPool';
import { ADDRESSES } from '@/test/lib/constants';
import { BalancerError, BalancerErrorCode } from '@/balancerErrors';

import pools_14717479 from '@/test/lib/pools_14717479.json';

let sdkConfig: BalancerSdkConfig;

dotenv.config();

describe('pricing module', () => {
  before(() => {
    // Mainnet pool snapshot taken at block 14717479
    const mockPoolDataService = new MockPoolDataService(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pools_14717479 as any
    );

    const sorConfig: BalancerSdkSorConfig = {
      tokenPriceService: 'coingecko',
      poolDataService: mockPoolDataService,
      fetchOnChainBalances: false,
    };

    sdkConfig = {
      network: Network.MAINNET,
      rpcUrl: ``,
      sor: sorConfig,
    };
  });

  context('instantiation', () => {
    it('instantiate via module', async () => {
      const pricing = new Pricing(sdkConfig);
      await pricing.fetchPools();
      const pools = pricing.getPools();
      expect(pools).to.deep.eq(pools_14717479);
    });

    it('instantiate via SDK', async () => {
      const balancer = new BalancerSDK(sdkConfig);
      await balancer.pricing.fetchPools();
      const pools = balancer.pricing.getPools();
      expect(pools).to.deep.eq(pools_14717479);
    });
  });

  context('spot price without pool - finds most liquid path', () => {
    describe('via module', () => {
      it('should throw for pair with no liquidity', async () => {
        let error = null;
        try {
          const pricing = new Pricing(sdkConfig);
          await pricing.getSpotPrice('', '');
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
          error = err.message;
        }
        expect(error).to.eq(
          BalancerError.getMessage(BalancerErrorCode.UNSUPPORTED_PAIR)
        );
      });

      it('should fetch pools with no pools data param', async () => {
        const pricing = new Pricing(sdkConfig);
        const sp = await pricing.getSpotPrice(
          ADDRESSES[Network.MAINNET].WETH.address,
          ADDRESSES[Network.MAINNET].USDC.address
        );
        expect(sp).to.deep.eq('0.0003423365526722167');
      });

      it('should fetch pools with no pools data param', async () => {
        const pricing = new Pricing(sdkConfig);
        const sp = await pricing.getSpotPrice(
          ADDRESSES[Network.MAINNET].USDC.address,
          ADDRESSES[Network.MAINNET].WETH.address
        );
        expect(sp).to.deep.eq('2925.488620398681');
      });
    });

    describe('via SDK', () => {
      it('should fetch pools with no pools data param', async () => {
        const balancer = new BalancerSDK(sdkConfig);
        const sp = await balancer.pricing.getSpotPrice(
          ADDRESSES[Network.MAINNET].WETH.address,
          ADDRESSES[Network.MAINNET].USDC.address
        );
        expect(sp).to.deep.eq('0.0003423365526722167');
      });
    });
  });
});
