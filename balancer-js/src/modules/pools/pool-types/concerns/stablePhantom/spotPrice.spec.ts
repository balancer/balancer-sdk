import { expect } from 'chai';
import pools_14717479 from '@/test/lib/pools_14717479.json';
import { Network, Pool } from '@/.';
import { PhantomStablePoolSpotPrice } from './spotPrice.concern';
import { ADDRESSES } from '@/test/lib/constants';

const network = Network.MAINNET;

const spotPriceCalc = new PhantomStablePoolSpotPrice();
const poolId =
  '0x7b50775383d3d6f0215a8f290f2c9e2eebbeceb20000000000000000000000fe';

const pool = pools_14717479.find(
  (pool) => pool.id == poolId
) as unknown as Pool;

describe('phantomStable pool spot price', () => {
  context('calcPoolSpotPrice', () => {
    it('should calculate spot price for pair', () => {
      const spotPrice = spotPriceCalc.calcPoolSpotPrice(
        ADDRESSES[network].bbausd.address,
        ADDRESSES[network].bbausdc.address,
        pool
      );
      expect(spotPrice).to.eq('0.997873677414938406552928560423740375');
    });
  });
});
