import dotenv from 'dotenv';
import { expect } from 'chai';
import { PhantomStablePriceImpact } from '@/modules/pools/pool-types/concerns/stablePhantom/priceImpact.concern';
import { MockPoolDataService } from '@/test/lib/mockPool';

import pools_14717479 from '@/test/lib/pools_14717479.json';

dotenv.config();

const priceImpactCalc = new PhantomStablePriceImpact();
let mockPoolDataService: MockPoolDataService;
const bbaUSDPoolId =
  '0x7b50775383d3d6f0215a8f290f2c9e2eebbeceb20000000000000000000000fe';

describe('phantomStable pool price impact', () => {
  before(async () => {
    // Mainnet pool snapshot taken at block 14717479
    mockPoolDataService = new MockPoolDataService(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pools_14717479 as any
    );
  });

  context('bpt zero price impact', () => {
    it('test1', () => {
      const pool = mockPoolDataService.getPool(bbaUSDPoolId);
      const tokenAmounts = [
        BigInt('6298701629199810399876'),
        BigInt('615159929697'),
        BigInt('101515992969778'),
      ];
      const bptZeroPriceImpact = priceImpactCalc.bptZeroPriceImpact(
        pool,
        tokenAmounts
      );
      expect(bptZeroPriceImpact.toString()).to.eq('6310741387055771004078');
    });

    it('test2', () => {
      const pool = mockPoolDataService.getPool(bbaUSDPoolId);
      console.log(pool.poolType);
      // This tokenAmounts vector is proportional to the balances
      // so that the correct return value is totalShares times the
      // proportionality constant, equal to 0.01
      const tokenAmounts = [
        BigInt('831191821406963569140405'),
        BigInt('851842896587052519012488'),
        BigInt('906277003015102397681882'),
      ];

      const bptZeroPriceImpact = priceImpactCalc.bptZeroPriceImpact(
        pool,
        tokenAmounts
      );
      expect(bptZeroPriceImpact.toString()).to.eq('2584652218704385059205928');
    });
  });
  context('price impact', () => {
    it('calculate price impact', () => {
      // expect(true).to.eq(false);
    });
  });
});
