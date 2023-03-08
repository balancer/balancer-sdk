// yarn test:only src/modules/pools/pool-types/concerns/stable/priceImpact.spec.ts
import { expect } from 'chai';
import { StablePoolPriceImpact } from '@/modules/pools/pool-types/concerns/stable/priceImpact.concern';
import pools_14717479 from '@/test/lib/pools_14717479.json';
import { Pool } from '@/types';

const priceImpactCalc = new StablePoolPriceImpact();
const staBal3Id =
  '0x06df3b2bbb68adc8b0e302443692037ed9f91b42000000000000000000000063';

const pool = pools_14717479.find(
  (pool) => pool.id == staBal3Id
) as unknown as Pool;

const tokenAmounts = [
  BigInt('10000100000000000000'),
  BigInt('100000000'),
  BigInt('20345000'),
];

describe('stable pool price impact', () => {
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
      const bptZeroPriceImpact = priceImpactCalc.bptZeroPriceImpact(
        pool,
        tokenAmounts
      );
      expect(bptZeroPriceImpact.toString()).to.eq('129598303041827170846');
    });
  });

  context('price impact', () => {
    it('calculate price impact', () => {
      const priceImpact = priceImpactCalc.calcPriceImpact(
        pool,
        tokenAmounts,
        BigInt('109598303041827170846'),
        true
        // this not the actual bptAmount that would result
        // but it is still useful for testing purposes
      );
      expect(priceImpact.toString()).to.eq('154323008330943232');
    });
  });
});
