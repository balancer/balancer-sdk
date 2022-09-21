import dotenv from 'dotenv';
import { expect } from 'chai';
import MockDate from 'mockdate';
import { BalancerSDK } from '@/modules/sdk.module';
import { JsonRpcProvider } from '@ethersproject/providers';

dotenv.config();

const sdk = new BalancerSDK({
  network: 1,
  rpcUrl: 'http://127.0.0.1:8545',
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

const auraBALveBAL =
  '0x3dd0843a028c86e0b760b1a76929d1c5ef93a2dd000200000000000000000249';

describe('happy case', () => {
  // Time when veBal used to recieve procotol revenues
  const now = new Date('2022-08-19 11:11:11').getTime();

  before(async function () {
    MockDate.set(now);

    const rpcProvider = sdk.rpcProvider as JsonRpcProvider;

    await rpcProvider.send('hardhat_reset', [
      {
        forking: {
          jsonRpcUrl: process.env.RPC_URL || process.env.ALCHEMY_URL,
          blockNumber: 15370937, // 2022-08-19 11:11:11
        },
      },
    ]);
  });

  after(() => {
    MockDate.reset();
  });

  describe('duplicated pool with an empty gauge', () => {
    it('has tokenAprs', async () => {
      const pool = await pools.find(ethStEthCopy);
      if (pool) {
        const apr = await pools.apr(pool);
        expect(apr && apr.tokenAprs.total).to.be.greaterThan(1);
      } else {
        throw 'no pool found';
      }
    }).timeout(120000);
  });

  describe('pool with yield tokens', () => {
    it('has tokenAprs', async () => {
      const pool = await pools.find(ethStEth);
      if (pool) {
        const apr = await pools.apr(pool);
        expect(apr && apr.tokenAprs.total).to.be.greaterThan(1);
      } else {
        throw 'no pool found';
      }
    }).timeout(120000);
  });

  describe('phantom pool with linear pools', () => {
    it('has tokenAprs', async () => {
      const pool = await pools.find(usdStable);
      if (pool) {
        const apr = await pools.apr(pool);
        expect(apr && apr.tokenAprs.total).to.be.greaterThan(1);
      } else {
        throw 'no pool found';
      }
    }).timeout(120000);
  });

  describe('veBal pool', () => {
    it('receives protocol revenues', async () => {
      const pool = await pools.find(veBalId);
      if (pool) {
        const apr = await pools.apr(pool);
        expect(apr && apr.protocolApr).to.be.greaterThan(1);
      } else {
        throw 'no pool found';
      }
    }).timeout(120000);
  });

  describe('weighted pool with gauge', () => {
    it('receives staking rewards', async () => {
      const pool = await pools.find(btcEth);
      if (pool) {
        const apr = await pools.apr(pool);
        expect(apr && apr.stakingApr.min).to.be.greaterThan(1);
      } else {
        throw 'no pool found';
      }
    }).timeout(120000);
  });

  describe('auraBAL / veBAL pool', () => {
    it('has tokenAprs', async () => {
      const pool = await pools.find(auraBALveBAL);
      if (pool) {
        const apr = await pools.apr(pool);
        expect(apr && apr.tokenAprs.total).to.be.greaterThan(1);
      } else {
        throw 'no pool found';
      }
    }).timeout(120000);
  });
});
