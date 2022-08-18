import dotenv from 'dotenv';
import { expect } from 'chai';
import MockDate from 'mockdate';
import { BalancerSDK } from '@/modules/sdk.module';

dotenv.config();

const sdk = new BalancerSDK({
  network: 1,
  rpcUrl:
    process.env.RPC_URL || process.env.ALCHEMY_URL || 'http://127.0.0.1:8545',
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

const ethStEthCopy =
  '0x851523a36690bf267bbfec389c823072d82921a90002000000000000000001ed';

describe('happy case', () => {
  describe('duplicated pool with an empty gauge', () => {
    it('has tokenAprs', async () => {
      const pool = await pools.find(ethStEthCopy);
      if (pool) {
        const apr = await pool.apr();
        expect(apr.tokenAprs).to.be.greaterThan(1);
      }
    }).timeout(120000);
  });

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
    const now = new Date('2022-08-19 11:11:11').getTime();

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
