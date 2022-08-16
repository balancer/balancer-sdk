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
import nock from 'nock';

// nock.disableNetConnect();

nock('https://api.thegraph.com')
  .persist()
  .post('/subgraphs/name/balancer-labs/balancer-gauges')
  .reply(200, {
    data: {
      liquidityGauges: [
        {
          id: '0x4e3c048be671852277ad6ce29fd5207aa12fabff',
          symbol: 'B-50WBTC-50WETH-gauge',
          poolAddress: '0xa6f548df93de924d73be7d25dc02554c6bd66db5',
          poolId:
            '0xa6f548df93de924d73be7d25dc02554c6bd66db500020000000000000000000e',
          streamer: null,
          factory: {
            id: '0x4e7bbd911cf1efa442bc1b2e9ea01ffe785412ec',
            numGauges: 60,
          },
          totalSupply: '3716.182515572399911367',
          tokens: [],
        },
      ],
    },
  });

const tokenPrices = tokensToTokenPrices(TOKENS);

const poolProvider = new PoolsStaticRepository(POOLS as Pool[]);
const tokenPriceProvider = new StaticTokenPriceProvider(tokenPrices);
const tokenProvider = new StaticTokenProvider(TOKENS);

const balancerConfig: BalancerSdkConfig = {
  network: 1,
  rpcUrl: 'https://mainnet.infura.io/v3/daaa68ec242643719749dd1caba2fc66',
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
      const pool = findPool('0xa6f548df93de924d73be7d25dc02554c6bd66db5');
      const poolModel = Pools.wrap(pool, networkConfig, poolsRepositories);
      const liquidity = await poolModel.liquidity();
      poolModel.totalLiquidity = liquidity;
      const apr = await poolModel.apr();
      console.log('APR is: ', apr);
      expect(apr.min).to.be.greaterThan(0);
      expect(apr.max).to.be.greaterThan(0);
    });
  });
});
