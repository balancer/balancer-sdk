import dotenv from 'dotenv';
import { expect } from 'chai';
import pools_14717479 from '@/test/lib/pools_14717479.json';
import { StaticPoolRepository } from '@/modules/data';
import { PoolsProvider } from '@/modules/pools/provider';
import { PoolModel, Pool } from '@/types';
import { Network } from '@/.';
import { setupPool } from '@/test/lib/utils';
import { PhantomStablePoolSpotPrice } from './spotPrice.concern';
import { ADDRESSES } from '@/test/lib/constants';

dotenv.config();

const network = Network.MAINNET;
const rpcUrl = 'http://127.0.0.1:8545';

const spotPriceCalc = new PhantomStablePoolSpotPrice();
const phantomStableId =
  '0x7b50775383d3d6f0215a8f290f2c9e2eebbeceb20000000000000000000000fe';

describe('phantomStable pool spot price', () => {
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
    pool = await setupPool(poolsProvider, phantomStableId);
  });

  context('calcPoolSpotPrice', () => {
    it('should calculate spot price for pair', () => {
      const spotPrice = spotPriceCalc.calcPoolSpotPrice(
        ADDRESSES[network].bbausd.address,
        ADDRESSES[network].bbausdc.address,
        pool as PoolModel
      );
      expect(spotPrice).to.eq('0.997873677414938406552928560423740375');
    });
  });
});
