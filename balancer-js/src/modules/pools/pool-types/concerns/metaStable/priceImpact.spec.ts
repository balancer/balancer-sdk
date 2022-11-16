import { expect } from 'chai';
import { MetaStablePoolPriceImpact } from '@/modules/pools/pool-types/concerns/metaStable/priceImpact.concern';
import pools_14717479 from '@/test/lib/pools_14717479.json';
import { Pool } from '@/types';

const priceImpactCalc = new MetaStablePoolPriceImpact();
const wstETHwETH =
  '0x32296969ef14eb0c6d29669c550d4a0449130230000200000000000000000080';

const pool = pools_14717479.find(
  (pool) => pool.id == wstETHwETH
) as unknown as Pool;

const tokenAmounts = [
  BigInt('629870162919981039400158'),
  BigInt('615159929697'),
];

describe('metastable pool price impact', () => {
  context('bpt zero price impact', () => {
    it('non-proportional case', () => {
      const bptZeroPriceImpact = priceImpactCalc.bptZeroPriceImpact(
        pool,
        tokenAmounts
      );
      expect(bptZeroPriceImpact.toString()).to.eq('662816325116386208862285');
    });
    it('proportional case', () => {
      // This tokenAmounts vector is proportional to the balances
      // so that the correct return value is totalShares times the
      // proportionality constant, equal to 0.01
      const proportionalTokenAmounts = [
        BigInt('813913487516879908953'),
        BigInt('854410030026808373669'),
      ];

      const bptZeroPriceImpact = priceImpactCalc.bptZeroPriceImpact(
        pool,
        proportionalTokenAmounts
      );
      expect(bptZeroPriceImpact.toString()).to.eq('1696871032806568300470');
    });
  });

  context('price impact', () => {
    it('calculate price impact', () => {
      const priceImpact = priceImpactCalc.calcPriceImpact(
        pool,
        tokenAmounts.map((amount) => amount.toString()),
        '660816325116386208862285',
        true
      );
      expect(priceImpact.toString()).to.eq('3017427187914862');
    });
  });
});
