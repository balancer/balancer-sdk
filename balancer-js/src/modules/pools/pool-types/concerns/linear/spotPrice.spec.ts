import { expect } from 'chai';
import pools_14717479 from '@/test/lib/pools_14717479.json';
import { Network, Pool } from '@/.';
import { LinearPoolSpotPrice } from './spotPrice.concern';
import { ADDRESSES } from '@/test/lib/constants';

const spotPriceCalc = new LinearPoolSpotPrice();
const network = Network.MAINNET;
const poolId =
  '0x9210f1204b5a24742eba12f710636d76240df3d00000000000000000000000fc';

const pool = pools_14717479.find(
  (pool) => pool.id == poolId
) as unknown as Pool;

describe('Linear pool spot price', () => {
  context('calcPoolSpotPrice', () => {
    it('should calculate spot price for pair', () => {
      const spotPrice = spotPriceCalc.calcPoolSpotPrice(
        ADDRESSES[network].USDC.address,
        ADDRESSES[network].bbausdcOld.address,
        pool
      );
      expect(spotPrice).to.eq('1.008078200925769181');
    });
  });
});
