import dotenv from 'dotenv';
import { expect } from 'chai';
import { WeightedPoolPriceImpact } from '@/modules/pools/pool-types/concerns/weighted/priceImpact.concern';
import { MockPoolDataService } from '@/test/lib/mockPool';

import pools_14717479 from '@/test/lib/pools_14717479.json';

dotenv.config();

const priceImpactCalc = new WeightedPoolPriceImpact();
let mockPoolDataService: MockPoolDataService;

describe('weighted pool price impact', () => {
  before(async () => {
    // Mainnet pool snapshot taken at block 14717479
    mockPoolDataService = new MockPoolDataService(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pools_14717479 as any
    );
  });

  context('bpt zero price impact', () => {
    it('two token pool', () => {
      const wethDaiId =
        '0x0b09dea16768f0799065c475be02919503cb2a3500020000000000000000001a';
      const pool = mockPoolDataService.getPool(wethDaiId);
      const tokenAmounts = [
        BigInt('10000000000000000000'),
        BigInt('100000000000000000000'),
      ];

      const bptZeroPriceImpact = priceImpactCalc.bptZeroPriceImpact(
        pool,
        tokenAmounts
      );
      expect(bptZeroPriceImpact.toString()).to.eq('2362847643421361281550');
    });
    it('three token pool', () => {
      const threeTokensPoolId =
        '0xb39362c3d5ac235fe588b0b83ed7ac87241039cb000100000000000000000195';
      const pool = mockPoolDataService.getPool(threeTokensPoolId);
      const tokenAmounts = [
        BigInt('10234000000000000000'),
        BigInt('23420000000000000'),
        BigInt('2000000000000000000000'),
      ];

      const bptZeroPriceImpact = priceImpactCalc.bptZeroPriceImpact(
        pool,
        tokenAmounts
      );
      expect(bptZeroPriceImpact.toString()).to.eq('876361770363362937782');
    });
  });

  context('price impact', () => {
    it('calculate price impact', () => {
      expect(true).to.eq(false);
    });
  });
});
