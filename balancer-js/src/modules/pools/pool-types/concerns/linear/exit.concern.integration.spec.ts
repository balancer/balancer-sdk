// yarn test:only ./src/modules/pools/pool-types/concerns/linear/exit.concern.integration.spec.ts
import { parseFixed } from '@ethersproject/bignumber';
import dotenv from 'dotenv';
import { ethers } from 'hardhat';

import { getPoolAddress, Network, PoolWithMethods } from '@/.';
import { forkSetup, TestPoolHelper } from '@/test/lib/utils';
import { testRecoveryExit } from '@/test/lib/exitHelper';

dotenv.config();

const { ALCHEMY_URL: jsonRpcUrl } = process.env;
const rpcUrl = 'http://127.0.0.1:8545';
const network = Network.MAINNET;
const provider = new ethers.providers.JsonRpcProvider(rpcUrl, network);
const signer = provider.getSigner();

describe('LinearPool - Exit Concern Integration Tests', async () => {
  let pool: PoolWithMethods;

  /**
   * Linear pools only allow exits while in recovery mode, so other exit types
   * don't need to be tested
   */

  // Skipping test because there is no Linear pool in recovery mode to test against
  context.skip('Recovery Mode', async () => {
    const blockNumber = 16819888;
    const poolIdInRecoveryMode =
      '0xa13a9247ea42d743238089903570127dda72fe4400000000000000000000035d';
    context('buildRecoveryExit', async () => {
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
