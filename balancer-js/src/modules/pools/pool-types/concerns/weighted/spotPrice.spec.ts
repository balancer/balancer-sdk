import dotenv from 'dotenv';
import { expect } from 'chai';
import pools_14717479 from '@/test/lib/pools_14717479.json';
import { StaticPoolRepository } from '@/modules/data';
import { PoolsProvider } from '@/modules/pools/provider';
import { PoolModel, Pool } from '@/types';
import { Network } from '@/.';
import { setupPool } from '@/test/lib/utils';
import { WeightedPoolSpotPrice } from './spotPrice.concern';
import { ADDRESSES } from '@/test/lib/constants';

dotenv.config();

const network = Network.MAINNET;
const rpcUrl = 'http://127.0.0.1:8545';

const spotPriceCalc = new WeightedPoolSpotPrice();
const weth_bal_pool_id =
  '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014';

describe('weighted pool spot price', () => {
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
    pool = await setupPool(poolsProvider, weth_bal_pool_id);
  });

  context('bpt zero price impact', () => {
    it('two token pool', () => {
      const spotPrice = spotPriceCalc.calcPoolSpotPrice(
        ADDRESSES[network].WETH.address,
        ADDRESSES[network].BAL.address,
        pool as PoolModel
      );

      expect(spotPrice).to.eq('0.004981212133448337');
    });
  });
});
