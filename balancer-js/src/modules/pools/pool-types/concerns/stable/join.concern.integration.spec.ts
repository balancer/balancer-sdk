// yarn test:only ./src/modules/pools/pool-types/concerns/stable/join.concern.integration.spec.ts
import { parseFixed } from '@ethersproject/bignumber';
import { expect } from 'chai';
import dotenv from 'dotenv';
import hardhat from 'hardhat';

import {
  BalancerError,
  BalancerErrorCode,
  Network,
  PoolWithMethods,
} from '@/.';
import { ADDRESSES, TEST_BLOCK } from '@/test/lib/constants';
import { forkSetup, TestPoolHelper } from '@/test/lib/utils';
import {
  testAttributes,
  testExactTokensIn,
  testSortingInputs,
} from '@/test/lib/joinHelper';

dotenv.config();

const { ALCHEMY_URL: jsonRpcUrl } = process.env;
const { ethers } = hardhat;
const rpcUrl = 'http://127.0.0.1:8545';
const network = Network.MAINNET;
const provider = new ethers.providers.JsonRpcProvider(rpcUrl, network);
const signer = provider.getSigner();
const initialBalance = '100000';
// This blockNumber is before protocol fees were switched on (Oct `21), for blockNos after this tests will fail because results don't 100% match
const blockNumber = TEST_BLOCK[network];
const testPoolId =
  '0x06df3b2bbb68adc8b0e302443692037ed9f91b42000000000000000000000063';
// Slots used to set the account balance for each token through hardhat_setStorageAt
// Info fetched using npm package slot20
const slots = [
  ADDRESSES[network].DAI.slot,
  ADDRESSES[network].USDC.slot,
  ADDRESSES[network].USDT.slot,
];

describe('Stable Pool - Join Functions', async () => {
  let signerAddress: string;
  let pool: PoolWithMethods;
  let testPoolHelper: TestPoolHelper;

  before(async () => {
    signerAddress = await signer.getAddress();
    testPoolHelper = new TestPoolHelper(
      testPoolId,
      network,
      rpcUrl,
      blockNumber
    );
    pool = await testPoolHelper.getPool();
  });

  context('Integration Tests', async () => {
    // Setup chain
    beforeEach(async function () {
      const balances = pool.tokens.map((token) =>
        parseFixed(initialBalance, token.decimals).toString()
      );
      await forkSetup(
        signer,
        pool.tokensList,
        slots,
        balances,
        jsonRpcUrl as string,
        blockNumber
      );
      pool = await testPoolHelper.getPool(); //Updates the pool with the new state from the forked setup
    });

    it('should join - all tokens have value', async () => {
      const tokensIn = pool.tokensList;
      const amountsIn = pool.tokens.map(({ decimals }, i) =>
        parseFixed(((i + 1) * 100).toString(), decimals).toString()
      );
      testExactTokensIn(pool, signer, signerAddress, tokensIn, amountsIn);
    });

    it('should join - single token has value', async () => {
      const tokensIn = pool.tokensList;
      const amountsIn = Array(tokensIn.length).fill('0');
      amountsIn[0] = parseFixed('202', 18).toString();
      testExactTokensIn(pool, signer, signerAddress, tokensIn, amountsIn);
    });
  });

  context('Unit Tests', () => {
    it('should return correct attributes for joining', () => {
      const tokensIn = pool.tokensList;
      const amountsIn = pool.tokens.map((t, i) =>
        parseFixed(((i + 1) * 100).toString(), t.decimals).toString()
      );
      testAttributes(pool, testPoolId, signerAddress, tokensIn, amountsIn);
    });

    it('should encode the same for different array sorting', () => {
      const tokensIn = pool.tokensList;
      const amountsIn = pool.tokens.map(({ decimals }, i) =>
        parseFixed(((i + 1) * 100).toString(), decimals).toString()
      );
      testSortingInputs(pool, signerAddress, tokensIn, amountsIn);
    });

    it('should fail when joining with wrong amounts array length', () => {
      const tokensIn = pool.tokensList;
      const amountsIn = [parseFixed('1', pool.tokens[0].decimals).toString()];
      const slippage = '0';
      let errorMessage;
      try {
        pool.buildJoin(signerAddress, tokensIn, amountsIn, slippage);
      } catch (error) {
        errorMessage = (error as Error).message;
      }
      expect(errorMessage).to.contain(
        BalancerError.getMessage(BalancerErrorCode.INPUT_LENGTH_MISMATCH)
      );
    });
  });
});
