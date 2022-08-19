import dotenv from 'dotenv';
import { Pool } from '@/types';
import { ModelProvider } from './model-provider';
import { expect } from 'chai';
import { factories } from '@/test/factories';

dotenv.config();

const wETH = factories.poolTokenFactory
  .transient({ symbol: 'wETH' })
  .build({ weight: '0.5', balance: '364' });
const wstETH = factories.poolTokenFactory
  .transient({ symbol: 'wstETH' })
  .build({ weight: '0.5', balance: '1' });
const tokens = [wstETH, wETH];

const pool = factories.poolFactory.build({
  address: 'pool',
  totalSwapFee: '1',
  totalShares: '365',
  tokens,
});

const poolsMap = new Map([[pool.address, pool]]);
const poolRepository = factories.data.findable<Pool>(poolsMap);

const repositories = factories.data.repositores({
  pools: poolRepository,
  yesterdaysPools: poolRepository,
});

describe('pools', () => {
  describe('wrap', () => {
    it('Should be able to wrap a pool', () => {
      const poolModel = ModelProvider.wrap(pool, repositories);
      expect(poolModel.address).to.equal(pool.address);
    }).timeout(20000);

    it('Should be able to calculate liquidity for the wrapped pool', async () => {
      const poolModel = ModelProvider.wrap(pool, repositories);
      const liquidity = await poolModel.calcLiquidity();
      expect(liquidity).to.equal('365');
    }).timeout(20000);

    it('Should be able to calculate APR for the wrapped pool', async () => {
      const poolModel = ModelProvider.wrap(pool, repositories);
      const liquidity = await poolModel.calcLiquidity();
      poolModel.totalLiquidity = liquidity;
      const apr = await poolModel.calcApr();
      expect(apr.min).to.be.greaterThan(0);
      expect(apr.max).to.be.greaterThan(0);
    }).timeout(20000);
  });

  describe('resolve', () => {
    it('Should be able to resolve a pool data', async () => {
      const poolModel = ModelProvider.wrap(pool, repositories);
      const poolData = await ModelProvider.resolve(poolModel);
      expect(typeof poolData.apr).to.equal('object');
    }).timeout(20000);
  });
});
