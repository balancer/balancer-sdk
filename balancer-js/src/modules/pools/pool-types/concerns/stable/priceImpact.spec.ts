import dotenv from 'dotenv';
import { expect } from 'chai';
import { StablePoolPriceImpact } from '@/modules/pools/pool-types/concerns/stable/priceImpact.concern';
import pools_14717479 from '@/test/lib/pools_14717479.json';
import { Pool, PoolModel } from '@/types';
import { StaticPoolRepository } from '@/modules/data';
import { PoolsProvider } from '@/modules/pools/provider';
import { Network } from '@/.';
import { setupPool } from '@/test/lib/utils';

dotenv.config();

const rpcUrl = 'http://127.0.0.1:8545';

const priceImpactCalc = new StablePoolPriceImpact();
const staBal3Id =
  '0x06df3b2bbb68adc8b0e302443692037ed9f91b42000000000000000000000063';

describe('stable pool price impact', () => {
  let pool: PoolModel;

  // Setup chain
  before(async function () {
    this.timeout(20000);
    const sdkConfig = {
      network: Network.MAINNET,
      rpcUrl,
    };
    // Using a static repository to make test consistent over time
    const poolsProvider = new PoolsProvider(
      sdkConfig,
      new StaticPoolRepository(pools_14717479 as Pool[])
    );
    pool = (await setupPool(poolsProvider, staBal3Id)) as PoolModel;
  });

  context('bpt zero price impact', () => {
    it('proportional case', () => {
      const proportionalTokenAmounts = [
        BigInt('629870162919981039400158'),
        BigInt('615159929697'),
        BigInt('641181657318'),
      ];

      const proportionalBptZeroPI = priceImpactCalc.bptZeroPriceImpact(
        pool,
        proportionalTokenAmounts
      );
      expect(proportionalBptZeroPI.toString()).to.eq(
        '1875386353951864923721207'
      );
    });
    it('non-proportional case', () => {
      const tokenAmounts = [
        BigInt('10000100000000000000'),
        BigInt('100000000'),
        BigInt('20345000'),
      ];

      const bptZeroPriceImpact = priceImpactCalc.bptZeroPriceImpact(
        pool,
        tokenAmounts
      );
      expect(bptZeroPriceImpact.toString()).to.eq('129598303041827170846');
    });
  });

  context('price impact', () => {
    it('calculate price impact', () => {
      const tokenAmounts = ['10000100000000000000', '100000000', '20345000'];
      const priceImpact = priceImpactCalc.calcPriceImpact(
        pool,
        tokenAmounts,
        '109598303041827170846'
        // this not the actual bptAmount that would result
        // but it is still useful for testing purposes
      );
      expect(priceImpact.toString()).to.eq('154323008330943232');
    });
  });
});
