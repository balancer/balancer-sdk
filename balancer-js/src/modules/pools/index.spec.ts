import dotenv from 'dotenv';
import { tokensToTokenPrices } from '@/lib/utils';
import { BalancerDataRepositories, Pool } from '@/types';
import POOLS from '../../test/fixtures/liquidityPools.json';
import TOKENS from '../../test/fixtures/liquidityTokens.json';
import {
  StaticPoolRepository,
  StaticTokenPriceProvider,
  StaticTokenProvider,
} from '../data';
import { Pools } from './';
import { BalancerSDK } from '../sdk.module';
import { expect } from 'chai';

dotenv.config();

const balancerSdk = new BalancerSDK({
  network: 1,
  rpcUrl: process.env.RPC_URL || '',
});
const { networkConfig, data } = balancerSdk;

const tokenPrices = tokensToTokenPrices(TOKENS);
const poolProvider = new StaticPoolRepository(POOLS as Pool[]);
const tokenPriceProvider = new StaticTokenPriceProvider(tokenPrices);
const tokenProvider = new StaticTokenProvider(TOKENS);
const staticData: BalancerDataRepositories = {
  ...data,
  ...{
    pools: poolProvider,
    tokenPrices: tokenPriceProvider,
    tokenMeta: tokenProvider,
  },
};

function findPool(address: string): Pool {
  const pool = POOLS.find((pool) => {
    return pool.address === address;
  });
  if (!pool) throw new Error('Could not find test pool of address: ' + address);
  return pool as Pool;
}

describe('pools', () => {
  describe('wrap', () => {
    it('Should be able to wrap a pool', () => {
      const pool = findPool('0xa6f548df93de924d73be7d25dc02554c6bd66db5');
      const poolModel = Pools.wrap(pool, networkConfig, staticData);
      expect(poolModel.address).to.equal(pool.address);
    }).timeout(20000);

    it('Should be able to calculate liquidity for the wrapped pool', async () => {
      const pool = findPool('0xa6f548df93de924d73be7d25dc02554c6bd66db5');
      const poolModel = Pools.wrap(pool, networkConfig, staticData);
      const liquidity = await poolModel.liquidity();
      expect(liquidity).to.equal('640000');
    }).timeout(20000);

    it('Should be able to calculate APR for the wrapped pool', async () => {
      const pool = findPool('0xa6f548df93de924d73be7d25dc02554c6bd66db5');
      const poolModel = Pools.wrap(pool, networkConfig, staticData);
      const liquidity = await poolModel.liquidity();
      poolModel.totalLiquidity = liquidity;
      const apr = await poolModel.apr();
      expect(apr.min).to.be.greaterThan(0);
      expect(apr.max).to.be.greaterThan(0);
    }).timeout(20000);
  });
});
