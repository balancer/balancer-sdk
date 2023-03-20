// yarn test:only src/modules/pools/pool-types/concerns/stablePhantom/priceImpact.spec.ts
import { expect } from 'chai';
import { StablePoolPriceImpact } from '@/modules/pools/pool-types/concerns/stable/priceImpact.concern';
import pools_14717479 from '@/test/lib/pools_14717479.json';
import { Pool } from '@/types';

const priceImpactCalc = new StablePoolPriceImpact();
const bbaUSDPoolId =
  '0x7b50775383d3d6f0215a8f290f2c9e2eebbeceb20000000000000000000000fe';

const pool = pools_14717479.find(
  (pool) => pool.id == bbaUSDPoolId
) as unknown as Pool;

const tokenAmounts = [
  BigInt('6298701629199810399876'),
  BigInt('615159929697'),
  BigInt('101515992969778'),
];

describe('phantomStable pool price impact', () => {
  context('bpt zero price impact', () => {
    it('non-proportional case', () => {
      const bptZeroPriceImpact = priceImpactCalc.bptZeroPriceImpact(
        pool,
        tokenAmounts
      );
      expect(bptZeroPriceImpact.toString()).to.eq('6294084206629046579738');
    });

    it('proportional case', () => {
      // the correct return value is totalShares times 0.01
      const proportionalTokenAmounts = [
        BigInt('831191821406963569140405'),
        BigInt('851842896587052519012488'),
        BigInt('906277003015102397681882'),
      ];

      const bptZeroPriceImpact = priceImpactCalc.bptZeroPriceImpact(
        pool,
        proportionalTokenAmounts
      );

      expect(bptZeroPriceImpact.toString()).to.eq('2584652218704385060046703');
    });
  });

  context('price impact', () => {
    it('calculate price impact', () => {
      const priceImpact = priceImpactCalc.calcPriceImpact(
        pool,
        tokenAmounts,
        BigInt('6094084206629046579738'),
        true
      );
      expect(priceImpact.toString()).to.eq('31775869758678519');
    });
  });
});
