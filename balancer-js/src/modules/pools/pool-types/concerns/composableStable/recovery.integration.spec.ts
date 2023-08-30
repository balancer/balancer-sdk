// yarn test:only ./src/modules/pools/pool-types/concerns/composableStable/recovery.integration.spec.ts
import dotenv from 'dotenv';
import { ethers } from 'hardhat';
import { parseFixed } from '@ethersproject/bignumber';
import {
  BalancerSDK,
  getPoolAddress,
  Network,
  GraphQLArgs,
  GraphQLQuery,
} from '@/.';
import { forkSetup } from '@/test/lib/utils';
import { assertRecoveryExit } from '@/test/lib/exitHelper';

dotenv.config();

const network = Network.POLYGON;
const { ALCHEMY_URL_POLYGON: jsonRpcUrl } = process.env;
const rpcUrl = 'http://127.0.0.1:8137';
const provider = new ethers.providers.JsonRpcProvider(rpcUrl, network);
const signer = provider.getSigner();
const blockNumber = 46939238;
let balancer: BalancerSDK;

describe('ComposableStable - recovery', () => {
  context('V1', async () => {
    const poolId =
      '0x02d2e2d7a89d6c5cb3681cfcb6f7dac02a55eda400000000000000000000088f';
    // We have to reset the fork between each test as pool value changes after tx is submitted
    beforeEach(async () => {
      // Setup forked network, set initial token balances and allowances
      await forkSetup(
        signer,
        [getPoolAddress(poolId)],
        [0],
        [parseFixed('10000', 18).toString()],
        jsonRpcUrl as string,
        blockNumber
      );
      const subgraphArgs: GraphQLArgs = {
        where: {
          id: {
            in: [poolId],
          },
        },
        block: { number: blockNumber },
      };

      const subgraphQuery: GraphQLQuery = { args: subgraphArgs, attrs: {} };
      balancer = new BalancerSDK({
        network,
        rpcUrl,
        subgraphQuery,
      });
    });

    context('buildRecoveryExit', async () => {
      context('PoolWithMethods', async () => {
        it('should recovery exit', async () => {
          const bptAmount = parseFixed('1.34', 18).toString();
          const slippage = '10'; // 10 bps = 0.1%
          const pool = await balancer.pools.find(poolId);
          if (!pool) throw Error('Pool not found');
          const signerAddr = await signer.getAddress();
          const { to, data, minAmountsOut, expectedAmountsOut, priceImpact } =
            pool.buildRecoveryExit(signerAddr, bptAmount, slippage);
          await assertRecoveryExit(
            signerAddr,
            slippage,
            to,
            data,
            minAmountsOut,
            expectedAmountsOut,
            priceImpact,
            pool,
            signer,
            bptAmount
          );
        });
      });
      context('Pool & refresh', async () => {
        it('should recovery exit', async () => {
          const bptAmount = parseFixed('1.34', 18).toString();
          const slippage = '10'; // 10 bps = 0.1%
          let pool = await balancer.data.pools.find(poolId);
          if (!pool) throw Error('Pool not found');
          const signerAddr = await signer.getAddress();
          pool = await balancer.data.poolsOnChain.refresh(pool);
          const { to, data, expectedAmountsOut, minAmountsOut, priceImpact } =
            balancer.pools.buildRecoveryExit({
              pool,
              bptAmount,
              userAddress: signerAddr,
              slippage,
            });
          await assertRecoveryExit(
            signerAddr,
            slippage,
            to,
            data,
            minAmountsOut,
            expectedAmountsOut,
            priceImpact,
            pool,
            signer,
            bptAmount
          );
        });
      });
    });
  });
  context('V2', async () => {
    const poolId =
      '0xe2dc0e0f2c358d6e31836dee69a558ab8d1390e70000000000000000000009fa';
    // We have to reset the fork between each test as pool value changes after tx is submitted
    beforeEach(async () => {
      // Setup forked network, set initial token balances and allowances
      await forkSetup(
        signer,
        [getPoolAddress(poolId)],
        [0],
        [parseFixed('10000', 18).toString()],
        jsonRpcUrl as string,
        blockNumber
      );
      const subgraphArgs: GraphQLArgs = {
        where: {
          id: {
            in: [poolId],
          },
        },
        block: { number: blockNumber },
      };

      const subgraphQuery: GraphQLQuery = { args: subgraphArgs, attrs: {} };
      balancer = new BalancerSDK({
        network,
        rpcUrl,
        subgraphQuery,
      });
    });

    context('buildRecoveryExit', async () => {
      context('PoolWithMethods', async () => {
        it('should recovery exit', async () => {
          const bptAmount = parseFixed('1.34', 18).toString();
          const slippage = '10'; // 10 bps = 0.1%
          const pool = await balancer.pools.find(poolId);
          if (!pool) throw Error('Pool not found');
          const signerAddr = await signer.getAddress();
          const { to, data, minAmountsOut, expectedAmountsOut, priceImpact } =
            pool.buildRecoveryExit(signerAddr, bptAmount, slippage);
          await assertRecoveryExit(
            signerAddr,
            slippage,
            to,
            data,
            minAmountsOut,
            expectedAmountsOut,
            priceImpact,
            pool,
            signer,
            bptAmount
          );
        });
      });
      context('Pool & refresh', async () => {
        it('should recovery exit', async () => {
          const bptAmount = parseFixed('1.34', 18).toString();
          const slippage = '10'; // 10 bps = 0.1%
          let pool = await balancer.data.pools.find(poolId);
          if (!pool) throw Error('Pool not found');
          const signerAddr = await signer.getAddress();
          pool = await balancer.data.poolsOnChain.refresh(pool);
          const { to, data, expectedAmountsOut, minAmountsOut, priceImpact } =
            balancer.pools.buildRecoveryExit({
              pool,
              bptAmount,
              userAddress: signerAddr,
              slippage,
            });
          await assertRecoveryExit(
            signerAddr,
            slippage,
            to,
            data,
            minAmountsOut,
            expectedAmountsOut,
            priceImpact,
            pool,
            signer,
            bptAmount
          );
        });
      });
    });
  });
  context('V3', async () => {
    const poolId =
      '0x10b040038f87219d9b42e025e3bd9b8095c87dd9000000000000000000000b11';
    // We have to reset the fork between each test as pool value changes after tx is submitted
    beforeEach(async () => {
      // Setup forked network, set initial token balances and allowances
      await forkSetup(
        signer,
        [getPoolAddress(poolId)],
        [0],
        [parseFixed('10000', 18).toString()],
        jsonRpcUrl as string,
        blockNumber
      );
      const subgraphArgs: GraphQLArgs = {
        where: {
          id: {
            in: [poolId],
          },
        },
        block: { number: blockNumber },
      };

      const subgraphQuery: GraphQLQuery = { args: subgraphArgs, attrs: {} };
      balancer = new BalancerSDK({
        network,
        rpcUrl,
        subgraphQuery,
      });
    });

    context('buildRecoveryExit', async () => {
      context('PoolWithMethods', async () => {
        it('should recovery exit', async () => {
          const bptAmount = parseFixed('0.001', 18).toString();
          const slippage = '10'; // 10 bps = 0.1%
          const pool = await balancer.pools.find(poolId);
          if (!pool) throw Error('Pool not found');
          const signerAddr = await signer.getAddress();
          const { to, data, minAmountsOut, expectedAmountsOut, priceImpact } =
            pool.buildRecoveryExit(signerAddr, bptAmount, slippage);
          await assertRecoveryExit(
            signerAddr,
            slippage,
            to,
            data,
            minAmountsOut,
            expectedAmountsOut,
            priceImpact,
            pool,
            signer,
            bptAmount
          );
        });
      });
      context('Pool & refresh', async () => {
        it('should recovery exit', async () => {
          const bptAmount = parseFixed('0.00001', 18).toString();
          const slippage = '10'; // 10 bps = 0.1%
          let pool = await balancer.data.pools.find(poolId);
          if (!pool) throw Error('Pool not found');
          const signerAddr = await signer.getAddress();
          pool = await balancer.data.poolsOnChain.refresh(pool);
          const { to, data, expectedAmountsOut, minAmountsOut, priceImpact } =
            balancer.pools.buildRecoveryExit({
              pool,
              bptAmount,
              userAddress: signerAddr,
              slippage,
            });
          await assertRecoveryExit(
            signerAddr,
            slippage,
            to,
            data,
            minAmountsOut,
            expectedAmountsOut,
            priceImpact,
            pool,
            signer,
            bptAmount
          );
        });
      });
    });
  });
  context('V4', async () => {
    const poolId =
      '0xa2ccad543fbe9332b87910beabd941b86dd5f762000000000000000000000b5c';
    // We have to reset the fork between each test as pool value changes after tx is submitted
    beforeEach(async () => {
      // Setup forked network, set initial token balances and allowances
      await forkSetup(
        signer,
        [getPoolAddress(poolId)],
        [0],
        [parseFixed('10000', 18).toString()],
        jsonRpcUrl as string,
        blockNumber
      );
      const subgraphArgs: GraphQLArgs = {
        where: {
          id: {
            in: [poolId],
          },
        },
        block: { number: blockNumber },
      };

      const subgraphQuery: GraphQLQuery = { args: subgraphArgs, attrs: {} };
      balancer = new BalancerSDK({
        network,
        rpcUrl,
        subgraphQuery,
      });
    });

    context('buildRecoveryExit', async () => {
      context('PoolWithMethods', async () => {
        it('should recovery exit', async () => {
          const bptAmount = parseFixed('0.34', 18).toString();
          const slippage = '10'; // 10 bps = 0.1%
          const pool = await balancer.pools.find(poolId);
          if (!pool) throw Error('Pool not found');
          const signerAddr = await signer.getAddress();
          const { to, data, minAmountsOut, expectedAmountsOut, priceImpact } =
            pool.buildRecoveryExit(signerAddr, bptAmount, slippage);
          await assertRecoveryExit(
            signerAddr,
            slippage,
            to,
            data,
            minAmountsOut,
            expectedAmountsOut,
            priceImpact,
            pool,
            signer,
            bptAmount
          );
        });
      });
      context('Pool & refresh', async () => {
        it('should recovery exit', async () => {
          const bptAmount = parseFixed('0.34', 18).toString();
          const slippage = '10'; // 10 bps = 0.1%
          let pool = await balancer.data.pools.find(poolId);
          if (!pool) throw Error('Pool not found');
          const signerAddr = await signer.getAddress();
          pool = await balancer.data.poolsOnChain.refresh(pool);
          const { to, data, expectedAmountsOut, minAmountsOut, priceImpact } =
            balancer.pools.buildRecoveryExit({
              pool,
              bptAmount,
              userAddress: signerAddr,
              slippage,
            });
          await assertRecoveryExit(
            signerAddr,
            slippage,
            to,
            data,
            minAmountsOut,
            expectedAmountsOut,
            priceImpact,
            pool,
            signer,
            bptAmount
          );
        });
      });
    });
  });
});
