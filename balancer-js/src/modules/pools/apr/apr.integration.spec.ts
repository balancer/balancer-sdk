// yarn test:only ./src/modules/pools/apr/apr-ignored.integration.spec.ts
import dotenv from 'dotenv';
dotenv.config();
import { expect } from 'chai';
import { BalancerSDK, Network } from '@/.';

const sdk = new BalancerSDK({
  network: Network.MAINNET,
  rpcUrl: `${process.env.ALCHEMY_URL}`,
});

const { pools } = sdk;

const ethStEth =
  '0x32296969ef14eb0c6d29669c550d4a0449130230000200000000000000000080';

const veBalId =
  '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014';

const usdStable =
  '0xa13a9247ea42d743238089903570127dda72fe4400000000000000000000035d';

const auraBALveBAL =
  '0x3dd0843a028c86e0b760b1a76929d1c5ef93a2dd000200000000000000000249';

describe('APR tests', () => {
  describe('pool with yield tokens', () => {
    it('has tokenAprs', async () => {
      const pool = await pools.find(ethStEth);
      if (pool) {
        const apr = await pools.apr(pool);
        expect(apr.tokenAprs.total).to.be.greaterThan(1);
      } else {
        throw 'no pool found';
      }
    }).timeout(120000);
  });

  describe('poold on ignore list', () => {
    it('should have APR 0', async () => {
      const pool = await pools.find(usdStable);
      if (pool) {
        const apr = await pools.apr(pool);
        expect(apr.tokenAprs.total).to.eq(0);
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
        expect(apr.protocolApr).to.be.greaterThan(1);
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
        expect(apr.tokenAprs.total).to.be.greaterThan(1);
      } else {
        throw 'no pool found';
      }
    }).timeout(120000);
  });
});
