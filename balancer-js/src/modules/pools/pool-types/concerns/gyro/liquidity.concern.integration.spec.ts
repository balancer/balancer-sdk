// yarn test:only ./src/modules/pools/pool-types/concerns/gyro/liquidity.concern.integration.spec.ts
import dotenv from 'dotenv';
import { Network, PoolWithMethods } from '@/types';
import { forkSetup, TestPoolHelper } from '@/test/lib/utils';
import { ethers } from 'hardhat';
import { BalancerSDK } from '@/modules/sdk.module';
import { expect } from 'chai';
import { formatFixed, parseFixed } from '@ethersproject/bignumber';
import { SolidityMaths } from '@/lib/utils/solidityMaths';

dotenv.config();

const network = Network.POLYGON;
const { ALCHEMY_URL_POLYGON: rpcUrlArchive } = process.env;
const rpcUrlLocal = 'http://127.0.0.1:8137';

const provider = new ethers.providers.JsonRpcProvider(rpcUrlLocal, network);
const signer = provider.getSigner();
const blockNumber = 42505555;

describe('Gyro Pools - Calculate Liquidity', () => {
  const sdkConfig = {
    network,
    rpcUrl: rpcUrlLocal,
  };
  const balancer = new BalancerSDK(sdkConfig);
  context('GyroE Pools', () => {
    const testPoolId =
      '0x97469e6236bd467cd147065f77752b00efadce8a0002000000000000000008c0';
    let pool: PoolWithMethods;
    before(async () => {
      const testPool = new TestPoolHelper(
        testPoolId,
        network,
        rpcUrlLocal,
        blockNumber
      );
      // Gets initial pool info from Subgraph
      pool = await testPool.getPool();

      // Setup forked network, set initial token balances and allowances
      await forkSetup(signer, [], [], [], rpcUrlArchive as string, undefined);

      // Update pool info with onchain state from fork block no
      pool = await testPool.getPool();
    });
    it('calculating liquidity', async () => {
      const liquidity = await balancer.pools.liquidity(pool);
      const liquidityFromContract = parseFixed(
        parseFloat(pool.totalLiquidity).toFixed(18).toString(),
        18
      ).toBigInt();
      const liquidityBigInt = parseFixed(liquidity, 18).toBigInt();
      // expecting 5% of margin error
      expect(
        parseFloat(
          formatFixed(
            SolidityMaths.divDownFixed(liquidityBigInt, liquidityFromContract),
            18
          ).toString()
        )
      ).to.be.closeTo(1, 0.05);
    });
  });
  context('Gyro V2 Pools', () => {
    const testPoolId =
      '0xdac42eeb17758daa38caf9a3540c808247527ae3000200000000000000000a2b';
    let pool: PoolWithMethods;
    before(async () => {
      const testPool = new TestPoolHelper(
        testPoolId,
        network,
        rpcUrlLocal,
        blockNumber
      );
      // Gets initial pool info from Subgraph
      pool = await testPool.getPool();

      // Setup forked network, set initial token balances and allowances
      await forkSetup(signer, [], [], [], rpcUrlArchive as string, undefined);

      // Update pool info with onchain state from fork block no
      pool = await testPool.getPool();
    });
    it('calculating liquidity', async () => {
      const liquidity = await balancer.pools.liquidity(pool);
      const liquidityFromContract = parseFixed(
        parseFloat(pool.totalLiquidity).toFixed(18).toString(),
        18
      ).toBigInt();
      const liquidityBigInt = parseFixed(liquidity, 18).toBigInt();
      // expecting 5% of margin error
      expect(
        parseFloat(
          formatFixed(
            SolidityMaths.divDownFixed(liquidityBigInt, liquidityFromContract),
            18
          ).toString()
        )
      ).to.be.closeTo(1, 0.05);
    });
  });
  context('Gyro V3 Pools', () => {
    const testPoolId =
      '0x17f1ef81707811ea15d9ee7c741179bbe2a63887000100000000000000000799';
    let pool: PoolWithMethods;
    before(async () => {
      const testPool = new TestPoolHelper(
        testPoolId,
        network,
        rpcUrlLocal,
        blockNumber
      );
      // Gets initial pool info from Subgraph
      pool = await testPool.getPool();

      // Setup forked network, set initial token balances and allowances
      await forkSetup(signer, [], [], [], rpcUrlArchive as string, undefined);

      // Update pool info with onchain state from fork block no
      pool = await testPool.getPool();
    });
    it('calculating liquidity', async () => {
      const liquidity = await balancer.pools.liquidity(pool);
      const liquidityFromContract = parseFixed(
        parseFloat(pool.totalLiquidity).toFixed(18).toString(),
        18
      ).toBigInt();
      const liquidityBigInt = parseFixed(liquidity, 18).toBigInt();
      // expecting 5% of margin error
      expect(
        parseFloat(
          formatFixed(
            SolidityMaths.divDownFixed(liquidityBigInt, liquidityFromContract),
            18
          ).toString()
        )
      ).to.be.closeTo(1, 0.05);
    });
  });
});
