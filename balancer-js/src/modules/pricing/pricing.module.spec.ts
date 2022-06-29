import dotenv from 'dotenv';
import { assert, expect } from 'chai';
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
import { WeightedPool } from '@balancer-labs/sor';
import { Pools } from '@/modules/pools/pools.module';

let sdkConfig: BalancerSdkConfig;

dotenv.config();

const weth_usdc_pool_id =
  '0x96646936b91d6b9d7d0c47c496afbf3d6ec7b6f8000200000000000000000019';
const weth_bal_pool_id =
  '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014';
const wethDaiId =
  '0x0b09dea16768f0799065c475be02919503cb2a3500020000000000000000001a';
const staBal3Id =
  '0x06df3b2bbb68adc8b0e302443692037ed9f91b42000000000000000000000063';

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

  context('spot price for pool', () => {
    describe('via module', () => {
      it('should fetch pools from poolDataService if no pools passed as param', async () => {
        const pricing = new Pricing(sdkConfig);
        const sp = await pricing.getSpotPrice(
          ADDRESSES[Network.MAINNET].WETH.address,
          ADDRESSES[Network.MAINNET].USDC.address,
          weth_usdc_pool_id
        );
        expect(sp).to.deep.eq('0.0003423365526722167');
      });

      it('should fetch pools from poolDataService if empty pools passed as param', async () => {
        const pricing = new Pricing(sdkConfig);
        const sp = await pricing.getSpotPrice(
          ADDRESSES[Network.MAINNET].USDC.address,
          ADDRESSES[Network.MAINNET].WETH.address,
          weth_usdc_pool_id,
          []
        );
        expect(sp).to.deep.eq('2925.488620398681');
      });

      it('should throw if poolDataService returns no pools', async () => {
        const emptyPoolDataService = new MockPoolDataService([]);
        const sorConfig: BalancerSdkSorConfig = {
          tokenPriceService: 'coingecko',
          poolDataService: emptyPoolDataService,
          fetchOnChainBalances: false,
        };
        const sdkConfig: BalancerSdkConfig = {
          network: Network.MAINNET,
          rpcUrl: ``,
          sor: sorConfig,
        };
        const balancer = new BalancerSDK(sdkConfig);
        let error = null;
        try {
          await balancer.pricing.getSpotPrice(
            ADDRESSES[Network.MAINNET].WETH.address,
            ADDRESSES[Network.MAINNET].USDC.address,
            weth_usdc_pool_id
          );
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
          error = err.message;
        }
        expect(error).to.eq(
          BalancerError.getMessage(BalancerErrorCode.POOL_DOESNT_EXIST)
        );
      });

      it('should throw with unsupported pool type', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const nonValidPool = { ...(pools_14717479[0] as any) };
        nonValidPool.poolType = 'UnsupportedPool';

        const balancer = new BalancerSDK(sdkConfig);
        let error = null;
        try {
          await balancer.pricing.getSpotPrice(
            ADDRESSES[Network.MAINNET].WETH.address,
            ADDRESSES[Network.MAINNET].BAL.address,
            pools_14717479[0].id,
            [nonValidPool]
          );
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
          error = err.message;
        }
        expect(error).to.eq(
          BalancerError.getMessage(BalancerErrorCode.UNSUPPORTED_POOL_TYPE)
        );
      });
    });
    describe('via SDK', () => {
      it('should fetch pools with no pools data param', async () => {
        const balancer = new BalancerSDK(sdkConfig);
        const sp = await balancer.pricing.getSpotPrice(
          ADDRESSES[Network.MAINNET].WETH.address,
          ADDRESSES[Network.MAINNET].BAL.address,
          weth_bal_pool_id
        );
        expect(sp).to.deep.eq('0.004981212133448337');
      });
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

    describe('stable pool', () => {
      it('should fetch correct sp', async () => {
        const balancer = new BalancerSDK(sdkConfig);
        const sp = await balancer.pricing.getSpotPrice(
          ADDRESSES[Network.MAINNET].DAI.address,
          ADDRESSES[Network.MAINNET].USDC.address,
          '0x06df3b2bbb68adc8b0e302443692037ed9f91b42000000000000000000000063'
        );
        expect(sp).to.deep.eq('1.000051911328148725');
      });
    });

    describe('metastable pool', () => {
      it('should fetch correct sp', async () => {
        const balancer = new BalancerSDK(sdkConfig);
        const sp = await balancer.pricing.getSpotPrice(
          ADDRESSES[Network.MAINNET].WETH.address,
          ADDRESSES[Network.MAINNET].wSTETH.address,
          '0x32296969ef14eb0c6d29669c550d4a0449130230000200000000000000000080'
        );
        expect(sp).to.deep.eq('1.070497605163895290828158545877174735');
      });
    });

    describe('phantomstable pool', () => {
      it('should fetch correct sp', async () => {
        const balancer = new BalancerSDK(sdkConfig);
        const sp = await balancer.pricing.getSpotPrice(
          ADDRESSES[Network.MAINNET].bbausd.address,
          ADDRESSES[Network.MAINNET].bbausdc.address,
          '0x7b50775383d3d6f0215a8f290f2c9e2eebbeceb20000000000000000000000fe'
        );
        expect(sp).to.deep.eq('0.997873677414938406552928560423740375');
      });
    });

    describe('linear pool', () => {
      it('should fetch correct sp', async () => {
        const balancer = new BalancerSDK(sdkConfig);
        const sp = await balancer.pricing.getSpotPrice(
          ADDRESSES[Network.MAINNET].USDC.address,
          ADDRESSES[Network.MAINNET].bbausdc.address,
          '0x9210f1204b5a24742eba12f710636d76240df3d00000000000000000000000fc'
        );
        expect(sp).to.deep.eq('1.008078200925769181');
      });
    });
  });

  context('price impact tests', () => {
    context('bpt zero price impact', () => {
      it('weighted pools', async () => {
        const balancer = new BalancerSDK(sdkConfig);
        await balancer.pricing.fetchPools();
        const pools = balancer.pricing.getPools();
        const pool = pools.find((pool) => pool.id == wethDaiId);
        assert.isTrue(pool != undefined, 'pool not found');
        if (!pool) return;
        let weightedPool = Pools.from(pool);
        let tokenAmounts = ['10', '100'];
        let bptZeroPriceImpact =
          weightedPool.priceImpactCalculator.bptZeroPriceImpact(
            pool,
            tokenAmounts
          );
        assert.equal(
          bptZeroPriceImpact,
          '2362.84764342136128155',
          'wrong value'
        );
        const threeTokensPoolId =
          '0xb39362c3d5ac235fe588b0b83ed7ac87241039cb000100000000000000000195';
        const threeTokensPool = pools.find(
          (pool) => pool.id == threeTokensPoolId
        );
        assert.isTrue(threeTokensPool != undefined, 'pool not found');
        if (!threeTokensPool) return;
        weightedPool = Pools.from(threeTokensPool);
        tokenAmounts = ['10.234', '0.02342', '2000'];
        bptZeroPriceImpact =
          weightedPool.priceImpactCalculator.bptZeroPriceImpact(
            threeTokensPool,
            tokenAmounts
          );
        assert.equal(
          bptZeroPriceImpact,
          '876.361770363362937782',
          'wrong value'
        );
      });
      it('stable pools', async () => {
        const balancer = new BalancerSDK(sdkConfig);
        await balancer.pricing.fetchPools();
        const pools = balancer.pricing.getPools();
        const pool = pools.find((pool) => pool.id == staBal3Id);
        assert.isTrue(pool != undefined, 'pool not found');
        if (!pool) return;
        const stablePool = Pools.from(pool);
        let tokenAmounts = [
          '629870.162919981039400158',
          '615159.92969774',
          '641181.65731857',
        ];
        let bptZeroPriceImpact =
          stablePool.priceImpactCalculator.bptZeroPriceImpact(
            pool,
            tokenAmounts
          );
        assert.equal(
          bptZeroPriceImpact,
          '1875386.353953167409103212',
          'wrong value'
        );
        tokenAmounts = ['10.0001', '100', '20.345'];
        bptZeroPriceImpact =
          stablePool.priceImpactCalculator.bptZeroPriceImpact(
            pool,
            tokenAmounts
          );
        assert.equal(
          bptZeroPriceImpact,
          '129.598303041827170846',
          'wrong value'
        );
      });
    });
  });
});
