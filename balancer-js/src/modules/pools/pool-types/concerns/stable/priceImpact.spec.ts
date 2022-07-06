import dotenv from 'dotenv';
import { expect } from 'chai';
import { StablePoolPriceImpact } from '@/modules/pools/pool-types/concerns/stable/priceImpact.concern';
import { MockPoolDataService } from '@/test/lib/mockPool';

import pools_14717479 from '@/test/lib/pools_14717479.json';

dotenv.config();

const priceImpactCalc = new StablePoolPriceImpact();
let mockPoolDataService: MockPoolDataService;
const staBal3Id =
  '0x06df3b2bbb68adc8b0e302443692037ed9f91b42000000000000000000000063';

describe('stable pool price impact', () => {
  before(async () => {
    // Mainnet pool snapshot taken at block 14717479
    mockPoolDataService = new MockPoolDataService(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pools_14717479 as any
    );
  });

  context('bpt zero price impact', () => {
    it('test1', () => {
      const pool = mockPoolDataService.getPool(staBal3Id);
      const tokenAmounts = [
        BigInt('629870162919981039400158'),
        BigInt('615159929697'),
        BigInt('641181657318'),
      ];

      const bptZeroPriceImpact = priceImpactCalc.bptZeroPriceImpact(
        pool,
        tokenAmounts
      );
      expect(bptZeroPriceImpact.toString()).to.eq('1875386353951864923721207');
    });
    it('test2', () => {
      const pool = mockPoolDataService.getPool(staBal3Id);
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
      expect(true).to.eq(false);
    });
  });
});
