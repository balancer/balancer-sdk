import { expect } from 'chai';
import pools_14717479 from '@/test/lib/pools_14717479.json';
import { Network, Pool } from '@/.';
import { StablePoolSpotPrice } from './spotPrice.concern';
import { ADDRESSES } from '@/test/lib/constants';

const network = Network.MAINNET;

const spotPriceCalc = new StablePoolSpotPrice();
const poolId =
  '0x06df3b2bbb68adc8b0e302443692037ed9f91b42000000000000000000000063';

const pool = pools_14717479.find(
  (pool) => pool.id == poolId
) as unknown as Pool;

describe('stable pool spot price', () => {
  context('calcPoolSpotPrice', () => {
    it('should calculate spot price for pair', () => {
      const spotPrice = spotPriceCalc.calcPoolSpotPrice(
        ADDRESSES[network].DAI.address,
        ADDRESSES[network].USDC.address,
        pool
      );
      expect(spotPrice).to.eq('1.000067171032243145');
    });
  });
});
