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
        '629870.162919981039400158',
        '615159.92969774',
        '641181.65731857',
      ];

      const bptZeroPriceImpact = priceImpactCalc.bptZeroPriceImpact(
        pool,
        tokenAmounts
      );
      expect(bptZeroPriceImpact).to.eq('1875386.353953167409103212');
    });
    it('test2', () => {
      const pool = mockPoolDataService.getPool(staBal3Id);
      const tokenAmounts = ['10.0001', '100', '20.345'];

      const bptZeroPriceImpact = priceImpactCalc.bptZeroPriceImpact(
        pool,
        tokenAmounts
      );
      expect(bptZeroPriceImpact).to.eq('129.598303041827170846');
    });
  });

  context('price impact', () => {
    it('calculate price impact', () => {
      expect(true).to.eq(false);
    });
  });
});
