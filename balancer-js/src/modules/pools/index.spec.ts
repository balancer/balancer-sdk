import { tokensToTokenPrices } from '@/lib/utils';
import { BalancerDataRepositories, BalancerSdkConfig, Pool } from '@/types';
import POOLS from '../../test/fixtures/liquidityPools.json';
import TOKENS from '../../test/fixtures/liquidityTokens.json';
import {
  PoolsStaticRepository,
  StaticTokenPriceProvider,
  StaticTokenProvider,
} from '../data';
import { Pools } from './';
import { BalancerSDK } from '../sdk.module';
import { expect } from 'chai';

const tokenPrices = tokensToTokenPrices(TOKENS);

const poolProvider = new PoolsStaticRepository(POOLS as Pool[]);
const tokenPriceProvider = new StaticTokenPriceProvider(tokenPrices);
const tokenProvider = new StaticTokenProvider(TOKENS);

const balancerConfig: BalancerSdkConfig = {
  network: 1,
  rpcUrl: '',
};

const balancerSdk = new BalancerSDK(balancerConfig);
const networkConfig = balancerSdk.networkConfig;
const dataRepositories = balancerSdk.dataRepositories;

const poolsRepositories: BalancerDataRepositories = {
  ...dataRepositories,
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
      const poolModel = Pools.wrap(pool, networkConfig, poolsRepositories);
      expect(poolModel.address).to.equal(pool.address);
    });

    it('Should be able to calculate liquidity for the wrapped pool', async () => {
      const pool = findPool('0xa6f548df93de924d73be7d25dc02554c6bd66db5');
      const poolModel = Pools.wrap(pool, networkConfig, poolsRepositories);
      const liquidity = await poolModel.liquidity();
      expect(liquidity).to.equal('640000');
    });

    it('Should be able to calculate APR for the wrapped pool', async () => {
      const pool = findPool('0xc6a5032dc4bf638e15b4a66bc718ba7ba474ff73');
      const poolModel = Pools.wrap(pool, networkConfig, poolsRepositories);
      const liquidity = await poolModel.liquidity();
      poolModel.totalLiquidity = liquidity;
      const apr = await poolModel.apr();
      expect(apr.min).to.be.greaterThan(0);
      expect(apr.max).to.be.greaterThan(0);
    });
  });
});
