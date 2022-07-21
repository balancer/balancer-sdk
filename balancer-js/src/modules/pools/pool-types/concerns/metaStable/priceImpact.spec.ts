import dotenv from 'dotenv';
import { expect } from 'chai';
import { MetaStablePoolPriceImpact } from '@/modules/pools/pool-types/concerns/metaStable/priceImpact.concern';
import { MockPoolDataService } from '@/test/lib/mockPool';

import pools_14717479 from '@/test/lib/pools_14717479.json';

dotenv.config();

const priceImpactCalc = new MetaStablePoolPriceImpact();
let mockPoolDataService: MockPoolDataService;
const wstETHwETH =
  '0x32296969ef14eb0c6d29669c550d4a0449130230000200000000000000000080';

describe('metastable pool price impact', () => {
  before(async () => {
    // Mainnet pool snapshot taken at block 14717479
    mockPoolDataService = new MockPoolDataService(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pools_14717479 as any
    );
  });

  context('bpt zero price impact', () => {
    it('test1', () => {
      const pool = mockPoolDataService.getPool(wstETHwETH);
      const tokenAmounts = [
        BigInt('629870162919981039400158'),
        BigInt('615159929697'),
      ];

      const bptZeroPriceImpact = priceImpactCalc.bptZeroPriceImpact(
        pool,
        tokenAmounts
      );
      expect(bptZeroPriceImpact.toString()).to.eq('662816325116386208862285');
    });
    it('test2', () => {
      const pool = mockPoolDataService.getPool(wstETHwETH);
      console.log(pool.poolType);
      // This tokenAmounts vector is proportional to the balances
      // so that the correct return value is totalShares times the
      // proportionality constant, equal to 0.01
      const tokenAmounts = [
        BigInt('813913487516879908953'),
        BigInt('854410030026808373669'),
      ];

      const bptZeroPriceImpact = priceImpactCalc.bptZeroPriceImpact(
        pool,
        tokenAmounts
      );
      expect(bptZeroPriceImpact.toString()).to.eq('1696871032806568300470');
    });
  });

  context('price impact', () => {
    it('calculate price impact', () => {
      // expect(true).to.eq(false);
    });
  });
});
