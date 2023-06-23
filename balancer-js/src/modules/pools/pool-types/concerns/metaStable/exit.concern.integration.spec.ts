// yarn test:only ./src/modules/pools/pool-types/concerns/metaStable/exit.concern.integration.spec.ts
import { parseFixed } from '@ethersproject/bignumber';
import dotenv from 'dotenv';
import { ethers } from 'hardhat';

import { getPoolAddress, Network, PoolWithMethods } from '@/.';
import { forkSetup, TestPoolHelper } from '@/test/lib/utils';
import {
  testExactBptIn,
  testExactTokensOut,
  testRecoveryExit,
} from '@/test/lib/exitHelper';
import { TEST_BLOCK } from '@/test/lib/constants';

dotenv.config();

const { ALCHEMY_URL: jsonRpcUrl } = process.env;
const rpcUrl = 'http://127.0.0.1:8545';
const network = Network.MAINNET;
const provider = new ethers.providers.JsonRpcProvider(rpcUrl, network);
const signer = provider.getSigner();

describe('MetaStablePool - Exit Concern Integration Tests', async () => {
  let pool: PoolWithMethods;

  context('regular exit pool functions', async () => {
    const blockNumber = TEST_BLOCK[network];
    const testPoolId =
      '0x32296969ef14eb0c6d29669c550d4a0449130230000200000000000000000080';
    beforeEach(async () => {
      // Setup forked network, set initial token balances and allowances
      await forkSetup(
        signer,
        [getPoolAddress(testPoolId)],
        [0],
        [parseFixed('10000', 18).toString()],
        jsonRpcUrl as string,
        blockNumber
      );
      // Updatate pool info with onchain state from fork block no
      const testPoolHelper = new TestPoolHelper(
        testPoolId,
        network,
        rpcUrl,
        blockNumber
      );
      pool = await testPoolHelper.getPool();
    });
    context('buildExitExactBPTIn', async () => {
      context('exitExactBPTIn', async () => {
        it('single token max out', async () => {
          const bptIn = parseFixed('10', 18).toString();
          const tokenOut = pool.tokensList[0];
          await testExactBptIn(pool, signer, bptIn, tokenOut);
        });
        it('proportional exit', async () => {
          const bptIn = parseFixed('10', 18).toString();
          await testExactBptIn(pool, signer, bptIn);
        });
      });
    });

    context('buildExitExactTokensOut', async () => {
      it('all tokens with value', async () => {
        const tokensOut = pool.tokensList;
        const amountsOut = tokensOut.map((_, i) =>
          parseFixed(((i + 1) * 100).toString(), 18).toString()
        );
        await testExactTokensOut(pool, signer, tokensOut, amountsOut);
      });
      it('single token with value', async () => {
        const tokensOut = pool.tokensList;
        const amountsOut = Array(tokensOut.length).fill('0');
        amountsOut[0] = parseFixed('100', 18).toString();
        await testExactTokensOut(pool, signer, tokensOut, amountsOut);
      });
    });
  });

  // Skipping test because there is no MetaStable pool in recovery mode
  context.skip('Recovery Mode', async () => {
    context('buildRecoveryExit', async () => {
      const blockNumber = TEST_BLOCK[network];
      const poolIdInRecoveryMode =
        '0xa13a9247ea42d743238089903570127dda72fe4400000000000000000000035d';
      beforeEach(async () => {
        // Setup forked network, set initial token balances and allowances
        await forkSetup(
          signer,
          [getPoolAddress(poolIdInRecoveryMode)],
          [0],
          [parseFixed('10000', 18).toString()],
          jsonRpcUrl as string,
          blockNumber
        );
        // Updatate pool info with onchain state from fork block no
        const testPoolHelper = new TestPoolHelper(
          poolIdInRecoveryMode,
          network,
          rpcUrl,
          blockNumber,
          false
        );
        pool = await testPoolHelper.getPool();
      });
      it('proportional exit', async () => {
        const bptIn = parseFixed('10', 18).toString();
        await testRecoveryExit(pool, signer, bptIn);
      });
    });
  });
});
