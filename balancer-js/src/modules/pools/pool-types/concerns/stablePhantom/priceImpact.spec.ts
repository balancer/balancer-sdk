import dotenv from 'dotenv';
import { expect } from 'chai';
import { StablePhantomPriceImpact } from '@/modules/pools/pool-types/concerns/stablePhantom/priceImpact.concern';

import pools_14717479 from '@/test/lib/pools_14717479.json';
import { StaticPoolRepository } from '@/modules/data';
import { PoolsProvider } from '@/modules/pools/provider';
import { PoolModel, Pool } from '@/types';
import { Network } from '@/.';
import { setupPool } from '@/test/lib/utils';

dotenv.config();
const rpcUrl = 'http://127.0.0.1:8545';
const priceImpactCalc = new StablePhantomPriceImpact();
const bbaUSDPoolId =
  '0x7b50775383d3d6f0215a8f290f2c9e2eebbeceb20000000000000000000000fe';

describe('phantomStable pool price impact', () => {
  let pool: PoolModel;

  // Setup chain
  before(async function () {
    this.timeout(20000);
    const sdkConfig = {
      network: Network.MAINNET,
      rpcUrl,
    };
    // Using a static repository to make test consistent over time
    const poolsProvider = new PoolsProvider(
      sdkConfig,
      new StaticPoolRepository(pools_14717479 as Pool[])
    );
    pool = await setupPool(poolsProvider, bbaUSDPoolId);
  });

  const tokenAmounts = [
    BigInt('6298701629199810399876'),
    BigInt('615159929697'),
    BigInt('101515992969778'),
  ];
  context('bpt zero price impact', () => {
    it('non-proportional case', () => {
      const bptZeroPriceImpact = priceImpactCalc.bptZeroPriceImpact(
        pool as PoolModel,
        tokenAmounts
      );
      expect(bptZeroPriceImpact.toString()).to.eq('6310741387055771004078');
    });

    it('proportional case', () => {
      // the correct return value is totalShares times 0.01
      const tokenAmounts = [
        BigInt('831191821406963569140405'),
        BigInt('851842896587052519012488'),
        BigInt('906277003015102397681882'),
      ];

      const bptZeroPriceImpact = priceImpactCalc.bptZeroPriceImpact(
        pool as PoolModel,
        tokenAmounts
      );
      expect(bptZeroPriceImpact.toString()).to.eq('2584652218704385059205928');
    });
  });

  context('price impact', () => {
    it('calculate price impact', () => {
      const priceImpact = priceImpactCalc.calcPriceImpact(
        pool as PoolModel,
        tokenAmounts.map((amount) => amount.toString()),
        '6300741387055771004078'
      );
      expect(priceImpact.toString()).to.eq('1584599872926409');
    });
  });
});
