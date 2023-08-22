// yarn test:only ./src/modules/pools/pool-types/concerns/weighted/recovery.integration.spec.ts
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
import { TEST_BLOCK } from '@/test/lib/constants';

dotenv.config();

const network = Network.MAINNET;
const { ALCHEMY_URL: jsonRpcUrl } = process.env;
const rpcUrl = 'http://127.0.0.1:8545';
const provider = new ethers.providers.JsonRpcProvider(rpcUrl, network);
const signer = provider.getSigner();
const blockNumber = TEST_BLOCK[network];
let balancer: BalancerSDK;

describe('Weighted - recovery', () => {
  context('V2', async () => {
    const poolId =
      '0x0fd5663d4893ae0d579d580584806aadd2dd0b8b000200000000000000000367';
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
      '0xa718042e5622099e5f0ace4e7122058ab39e1bbe000200000000000000000475';
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
});
