import { expect } from 'chai';
import MockDate from 'mockdate';
import { BalancerSDK } from '@/modules/sdk.module';
import { PoolModel } from '@/types';

const sdk = new BalancerSDK({
  network: 1,
  // rpcUrl: 'http://127.0.0.1:8545',
  rpcUrl:
    'https://eth-mainnet.alchemyapi.io/v2/7gYoDJEw6-QyVP5hd2UfZyelzDIDemGz',
});

const { pools } = sdk;

const ethStEth =
  '0x32296969ef14eb0c6d29669c550d4a0449130230000200000000000000000080';

const veBalId =
  '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014';

const usdStable =
  '0x7b50775383d3d6f0215a8f290f2c9e2eebbeceb20000000000000000000000fe';

const btcEth =
  '0xa6f548df93de924d73be7d25dc02554c6bd66db500020000000000000000000e';

describe('happy case', () => {
  describe('pool with yield tokens', () => {
    it('has tokenAprs', async () => {
      const pool = await pools.find(ethStEth);
      if (pool) {
        const apr = await pool.apr();
        expect(apr.tokenAprs).to.be.greaterThan(1);
      }
    }).timeout(120000);
  });

  describe('phantom pool with linear pools', () => {
    it('has tokenAprs', async () => {
      const pool = await pools.find(usdStable);
      if (pool) {
        const apr = await pool.apr();
        expect(apr.tokenAprs).to.be.greaterThan(1);
      }
    }).timeout(120000);
  });

  describe('veBal pool', () => {
    // Time when veBal used to recieve procotol revenues
    const now = new Date('2022-07-01 11:11:11').getTime();

    before(() => {
      MockDate.set(now);
    });

    after(() => {
      MockDate.reset();
    });

    it('receives protocol revenues', async () => {
      const pool = await pools.find(veBalId);
      if (pool) {
        const apr = await pool.apr();
        expect(apr.protocolApr).to.be.greaterThan(1);
      }
    }).timeout(120000);
  });

  describe('weighted pool with gauge', () => {
    // Time when btcEth pool used to recieve procotol revenues
    const now = new Date('2022-07-01 11:11:11').getTime();

    before(() => {
      MockDate.set(now);
    });

    after(() => {
      MockDate.reset();
    });

    it('receives staking rewards', async () => {
      const pool = await pools.find(btcEth);
      if (pool) {
        const apr = await pool.apr();
        expect(apr.stakingApr.min).to.be.greaterThan(1);
      }
    }).timeout(120000);
  });
});

describe('mainnet pools', () => {
  let poolsList: PoolModel[];

  // Getting 10 largest pools
  before(async () => {
    console.time('apr');
    poolsList = (await pools.where((pool) => pool.poolType != 'Element'))
      .sort(
        (a, b) => parseFloat(b.totalLiquidity) - parseFloat(a.totalLiquidity)
      )
      .slice(0, 10);
  });

  it('has APRs', async () => {
    if (poolsList.length > 0) {
      const aprs = await Promise.all(
        poolsList.map(async (pool) => {
          try {
            return await pool.apr();
          } catch (e) {
            console.log(e);
            return '0';
          }
        })
      );
      // Optionally move to another test file
      // console.log(
      //   poolsList.map((pool, i) => [pool.id, JSON.stringify(aprs[i], null, 2)])
      // );
      expect(aprs.length).to.be.greaterThan(0);
    }
    console.timeEnd('apr');
  }).timeout(120000);
});
