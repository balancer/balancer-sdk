import { expect } from 'chai';
import pools_14717479 from '@/test/lib/pools_14717479.json';
import { Network, Pool } from '@/.';
import { WeightedPoolSpotPrice } from './spotPrice.concern';
import { ADDRESSES } from '@/test/lib/constants';

const network = Network.MAINNET;

const spotPriceCalc = new WeightedPoolSpotPrice();
const poolId =
  '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014';

const pool = pools_14717479.find(
  (pool) => pool.id == poolId
) as unknown as Pool;

describe('weighted pool spot price', () => {
  context('calcPoolSpotPrice', () => {
    it('should calculate spot price for pair', () => {
      const spotPrice = spotPriceCalc.calcPoolSpotPrice(
        ADDRESSES[network].WETH.address,
        ADDRESSES[network].BAL.address,
        pool
      );

      expect(spotPrice).to.eq('0.004981212133448337');
    });
  });
});
