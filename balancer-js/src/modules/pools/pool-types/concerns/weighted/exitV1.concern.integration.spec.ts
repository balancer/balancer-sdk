// yarn test:only ./src/modules/pools/pool-types/concerns/weighted/exitV1.concern.integration.spec.ts
import { parseFixed } from '@ethersproject/bignumber';
import dotenv from 'dotenv';
import { ethers } from 'hardhat';

import { BalancerSDK, getPoolAddress, Network, PoolWithMethods } from '@/.';
import { BPT_DECIMALS, BPT_SLOT } from '@/lib/constants/config';
import { forkSetup, TestPoolHelper } from '@/test/lib/utils';
import { AddressZero } from '@ethersproject/constants';
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
const sdk = new BalancerSDK({ network, rpcUrl });
const { networkConfig } = sdk;
const provider = new ethers.providers.JsonRpcProvider(rpcUrl, network);
const signer = provider.getSigner();

describe('Weighted Pool - Exit Integration Test', async () => {
  let pool: PoolWithMethods;
  context('Regular Exit Pool Functions', async () => {
    // This blockNumber is before protocol fees were switched on (Oct `21), for blockNos after this tests will fail because results don't 100% match
    const blockNumber = TEST_BLOCK[network];
    const testPoolId =
      '0x96646936b91d6b9d7d0c47c496afbf3d6ec7b6f8000200000000000000000019';

    beforeEach(async () => {
      // Setup forked network, set initial token balances and allowances
      await forkSetup(
        signer,
        [getPoolAddress(testPoolId)],
        [BPT_SLOT],
        [parseFixed('100000', BPT_DECIMALS).toString()],
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

    context('buildExitExactTokensOut', async () => {
      it('all tokens with value', async () => {
        const tokensOut = pool.tokensList;
        const amountsOut = pool.tokens.map((t, i) =>
          parseFixed(((i + 1) * 10).toString(), t.decimals).toString()
        );
        // Not testing PI as not neccessarily balanced
        await testExactTokensOut(
          pool,
          signer,
          tokensOut,
          amountsOut,
          false,
          false
        );
      });
      it('single token with value', async () => {
        const tokensOut = pool.tokensList;
        const amountsOut = Array(tokensOut.length).fill('0');
        amountsOut[0] = parseFixed('10', pool.tokens[0].decimals).toString();
        await testExactTokensOut(pool, signer, tokensOut, amountsOut);
      });
      it('exit with ETH', async () => {
        const tokensOut = pool.tokensList.map((token) =>
          token ===
          networkConfig.addresses.tokens.wrappedNativeAsset.toLowerCase()
            ? AddressZero
            : token
        );
        const ethIndex = tokensOut.indexOf(AddressZero);
        const amountsOut = Array(tokensOut.length).fill('0');
        amountsOut[ethIndex] = parseFixed('1', 18).toString();
        await testExactTokensOut(pool, signer, tokensOut, amountsOut);
      });
    });
  });

  context('Recovery Exit', async () => {
    // This blockNumber is after this pool was paused and set to Recovery Mode to avoid loss of funds
    const blockNumber = TEST_BLOCK[network];
    const testPoolId =
      '0xa718042e5622099e5f0ace4e7122058ab39e1bbe000200000000000000000475';

    beforeEach(async () => {
      // Setup forked network, set initial token balances and allowances
      await forkSetup(
        signer,
        [getPoolAddress(testPoolId)],
        [BPT_SLOT],
        [parseFixed('100000', BPT_DECIMALS).toString()],
        jsonRpcUrl as string,
        blockNumber
      );
      // Updatate pool info with onchain state from fork block no
      const testPoolHelper = new TestPoolHelper(
        testPoolId,
        network,
        rpcUrl,
        blockNumber,
        false
      );
      pool = await testPoolHelper.getPool();
    });

    context('buildRecoveryExit', async () => {
      it('proportional exit', async () => {
        const bptIn = parseFixed('10', 18).toString();
        await testRecoveryExit(pool, signer, bptIn);
      });
    });
  });
});
