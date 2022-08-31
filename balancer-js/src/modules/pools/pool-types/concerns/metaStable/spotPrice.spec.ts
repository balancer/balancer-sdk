import dotenv from 'dotenv';
import { expect } from 'chai';
import pools_14717479 from '@/test/lib/pools_14717479.json';
import { StaticPoolRepository } from '@/modules/data';
import { PoolsProvider } from '@/modules/pools/provider';
import { PoolModel, Pool } from '@/types';
import { Network } from '@/.';
import { setupPool } from '@/test/lib/utils';
import { MetaStablePoolSpotPrice } from './spotPrice.concern';
import { ADDRESSES } from '@/test/lib/constants';

dotenv.config();

const network = Network.MAINNET;
const rpcUrl = 'http://127.0.0.1:8545';

const spotPriceCalc = new MetaStablePoolSpotPrice();
const metaStableId =
  '0x32296969ef14eb0c6d29669c550d4a0449130230000200000000000000000080';

describe('metaStable pool spot price', () => {
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
    pool = await setupPool(poolsProvider, metaStableId);
  });

  context('calcPoolSpotPrice', () => {
    it('should calculate spot price for pair', () => {
      const spotPrice = spotPriceCalc.calcPoolSpotPrice(
        ADDRESSES[network].WETH.address,
        ADDRESSES[network].wSTETH.address,
        pool as PoolModel
      );
      expect(spotPrice).to.eq('1.070497605163895290828158545877174735');
    });
  });
});
