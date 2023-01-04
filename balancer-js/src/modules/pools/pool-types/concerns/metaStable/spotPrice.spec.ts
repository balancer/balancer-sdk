import { expect } from 'chai';
import pools_14717479 from '@/test/lib/pools_14717479.json';
import { Network, Pool } from '@/.';
import { MetaStablePoolSpotPrice } from './spotPrice.concern';
import { ADDRESSES } from '@/test/lib/constants';

const network = Network.MAINNET;

const spotPriceCalc = new MetaStablePoolSpotPrice();
const poolId =
  '0x32296969ef14eb0c6d29669c550d4a0449130230000200000000000000000080';

const pool = pools_14717479.find(
  (pool) => pool.id == poolId
) as unknown as Pool;

describe('metaStable pool spot price', () => {
  context('calcPoolSpotPrice', () => {
    it('should calculate spot price for pair', () => {
      const spotPrice = spotPriceCalc.calcPoolSpotPrice(
        ADDRESSES[network].WETH.address,
        ADDRESSES[network].wSTETH.address,
        pool
      );
      expect(spotPrice).to.eq('1.070296441642066094033346842555222521');
    });
  });
});
