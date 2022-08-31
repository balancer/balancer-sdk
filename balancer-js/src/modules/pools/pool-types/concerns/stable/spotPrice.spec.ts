import dotenv from 'dotenv';
import { expect } from 'chai';
import pools_14717479 from '@/test/lib/pools_14717479.json';
import { StaticPoolRepository } from '@/modules/data';
import { PoolsProvider } from '@/modules/pools/provider';
import { PoolModel, Pool } from '@/types';
import { Network } from '@/.';
import { setupPool } from '@/test/lib/utils';
import { StablePoolSpotPrice } from './spotPrice.concern';
import { ADDRESSES } from '@/test/lib/constants';

dotenv.config();

const network = Network.MAINNET;
const rpcUrl = 'http://127.0.0.1:8545';

const spotPriceCalc = new StablePoolSpotPrice();
const stable_pool_id =
  '0x06df3b2bbb68adc8b0e302443692037ed9f91b42000000000000000000000063';

describe('stable pool spot price', () => {
  let pool: PoolModel | undefined;

  // Setup chain
  before(async function () {
    const sdkConfig = {
      network,
      rpcUrl,
    };
    // Using a static repository to make test consistent over time
    const poolsProvider = new PoolsProvider(
      sdkConfig,
      new StaticPoolRepository(pools_14717479 as Pool[])
    );
    pool = await setupPool(poolsProvider, stable_pool_id);
  });

  context('calcPoolSpotPrice', () => {
    it('should calculate spot price for pair', () => {
      const spotPrice = spotPriceCalc.calcPoolSpotPrice(
        ADDRESSES[network].DAI.address,
        ADDRESSES[network].USDC.address,
        pool as PoolModel
      );
      expect(spotPrice).to.eq('1.000051911328148725');
    });
  });
});
