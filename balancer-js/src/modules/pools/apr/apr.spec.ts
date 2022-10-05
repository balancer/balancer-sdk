import { BigNumber } from '@ethersproject/bignumber';
import { expect } from 'chai';
import MockDate from 'mockdate';
import { PoolApr } from './apr';
import { factories } from '@/test/factories';
import * as emissions from '@/modules/data/bal/emissions';
import type { LiquidityGauge, Pool } from '@/types';

const wETH = factories.poolTokenFactory
  .transient({ symbol: 'wETH' })
  .build({ weight: '0.5', balance: '364' });
const wstETH = factories.poolTokenFactory
  .transient({ symbol: 'wstETH' })
  .build({ weight: '0.5', balance: '1' });
const tokens = [wstETH, wETH];

const now = new Date();

const poolData = factories.poolFactory.build({
  address: 'pool',
  totalSwapFee: '1',
  totalShares: '365',
  tokens,
});

const yesterdaysPool = {
  ...poolData,
  totalSwapFee: '0',
};

const poolsMap = new Map([[poolData.address, poolData]]);
const poolRepository = factories.data.findable<Pool>(poolsMap);
const yesterdaysPoolsMap = new Map([[yesterdaysPool.id, yesterdaysPool]]);
const yesterdaysPoolRepository =
  factories.data.findable<Pool>(yesterdaysPoolsMap);
const repositories = factories.data.repositores({
  pools: poolRepository,
  yesterdaysPools: yesterdaysPoolRepository,
});

// TODO: move to factory
const baseGauge = {
  id: 'gauge',
  name: 'gauge',
  address: 'address',
  poolAddress: '1',
  totalSupply: 1,
  workingSupply: 1,
  relativeWeight: 1,
};

// TODO: move to factory
const baseRewardToken = {
  token: '0x0',
  distributor: '0x0',
  period_finish: BigNumber.from(Math.round(+now / 1000 + 7 * 86400)),
  rate: BigNumber.from('31709792000'), // 1 / 365 / 86400 scaled to 1e18
  integral: BigNumber.from('0'),
  last_update: BigNumber.from('0'),
};

describe('pool apr', () => {
  before(() => {
    MockDate.set(now);
  });

  after(() => {
    MockDate.reset();
  });

  describe('.swapFees', () => {
    // Notice that create time is set to 1 year ago.
    // With totalLiquidity and totalSwapFees = 100, it's 100% apr
    it('are 10000 bsp APR', async () => {
      const apr = await new PoolApr(
        repositories.pools,
        repositories.tokenPrices,
        repositories.tokenMeta,
        repositories.tokenYields,
        repositories.feeCollector,
        repositories.yesterdaysPools,
        repositories.liquidityGauges,
        repositories.feeDistributor
      ).swapFees(poolData);
      expect(apr).to.eq(10000);
    });
  });

  describe('.tokenAprs', () => {
    describe('lido token', () => {
      // It will equal 1%, because rate is 2% but weight is 50%
      it('are 100 bsp (1%)', async () => {
        const apr = await new PoolApr(
          repositories.pools,
          repositories.tokenPrices,
          repositories.tokenMeta,
          repositories.tokenYields,
          repositories.feeCollector,
          repositories.yesterdaysPools,
          repositories.liquidityGauges,
          repositories.feeDistributor
        ).tokenAprs(poolData);
        expect(apr.total).to.eq(100);
      });
    });

    describe('nested pools', () => {
      // Setting up pool with 100% total APR
      const pool = factories.poolFactory.build({
        address: 'pool1',
        totalSwapFee: '1',
        tokens,
      });
      // Notice weight of the bptToken.
      // It is defining share in tokenAprs
      const bptToken = factories.poolTokenFactory.build({
        address: 'pool1',
        decimals: 18,
        balance: '365',
        weight: '0.5',
      });
      const poolWithBpt = factories.poolFactory.build({
        address: 'poolWithBpt',
        tokens: [{ ...wETH, balance: '1' }, bptToken],
      });
      poolsMap.set(pool.address, pool);
      poolsMap.set(poolWithBpt.address, poolWithBpt);

      it('are 5000 bsp (50%) half of pool1 APR', async () => {
        const apr = await new PoolApr(
          repositories.pools,
          repositories.tokenPrices,
          repositories.tokenMeta,
          factories.data.stubbed<number>(undefined),
          factories.data.stubbed<number>(0),
          repositories.yesterdaysPools,
          repositories.liquidityGauges,
          repositories.feeDistributor
        ).tokenAprs(poolWithBpt);

        expect(apr.total).to.eq(10000 / 2);
      });
    });
  });

  describe('.stakingApr', () => {
    // Notice one token in gauge is worth 40% of it's value
    it('has bal rewards as ~40% apr', async () => {
      const now = Math.round(Date.now() / 1000);
      const balEmissions = emissions.between(now, now + 365 * 86400);

      const gauge = {
        ...baseGauge,
        workingSupply: balEmissions,
      };

      const apr = await new PoolApr(
        repositories.pools,
        repositories.tokenPrices,
        repositories.tokenMeta,
        factories.data.stubbed<number>(undefined),
        repositories.feeCollector,
        repositories.yesterdaysPools,
        factories.data.stubbed<LiquidityGauge>(gauge),
        repositories.feeDistributor
      ).stakingApr(poolData);

      expect(apr).to.eq(4000);
    });
  });

  describe('.rewardAprs', () => {
    it('has token rewards', async () => {
      const rewardTokens = {
        address1: baseRewardToken,
        address2: baseRewardToken,
      };
      const gauge = {
        ...baseGauge,
        rewardTokens,
      };

      const apr = await new PoolApr(
        repositories.pools,
        repositories.tokenPrices,
        repositories.tokenMeta,
        factories.data.stubbed<number>(undefined),
        repositories.feeCollector,
        repositories.yesterdaysPools,
        factories.data.stubbed<LiquidityGauge>(gauge),
        repositories.feeDistributor
      ).rewardAprs(poolData);

      expect(apr.total).to.eq(20000);

      const aprBreakdownSum = Object.values(apr.breakdown).reduce(
        (total, current) => (total += current),
        0
      );

      expect(aprBreakdownSum).to.eq(apr.total);
    });
  });
});
