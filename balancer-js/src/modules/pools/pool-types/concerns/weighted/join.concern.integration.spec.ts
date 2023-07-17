// yarn test:only ./src/modules/pools/pool-types/concerns/weighted/join.concern.integration.spec.ts
import { parseFixed } from '@ethersproject/bignumber';
import { AddressZero } from '@ethersproject/constants';
import dotenv from 'dotenv';
import hardhat from 'hardhat';

import { Address, BalancerSDK, Network, PoolWithMethods } from '@/.';
import { forkSetup, TestPoolHelper } from '@/test/lib/utils';
import { ADDRESSES, TEST_BLOCK } from '@/test/lib/constants';
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
const sdk = new BalancerSDK({ network, rpcUrl });
const { networkConfig } = sdk;
const provider = new ethers.providers.JsonRpcProvider(rpcUrl, 1);
const signer = provider.getSigner();

// Slots used to set the account balance for each token through hardhat_setStorageAt
// Info fetched using npm package slot20
const slots = [ADDRESSES[network].WBTC.slot, ADDRESSES[network].WETH.slot];
const initialBalance = '100000';
const testPoolId =
  '0xa6f548df93de924d73be7d25dc02554c6bd66db500020000000000000000000e'; // B_50WBTC_50WETH
const blockNumber = TEST_BLOCK[network];

describe('Weighted Pool - Join Functions', async () => {
  let pool: PoolWithMethods;
  let signerAddress: Address;
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
      pool = await testPoolHelper.getPool(); // update the pool after the forkSetup;
    });
    it('should join - all tokens have value', async () => {
      const tokensIn = pool.tokensList;
      const amountsIn = pool.tokens.map((t, i) =>
        parseFixed(((i + 1) * 100).toString(), t.decimals).toString()
      );
      testExactTokensIn(pool, signer, signerAddress, tokensIn, amountsIn);
    });

    it('should join - single token has value', async () => {
      const tokensIn = pool.tokensList;
      const amountsIn = Array(tokensIn.length).fill('0');
      amountsIn[0] = parseFixed('100', 8).toString();
      testExactTokensIn(pool, signer, signerAddress, tokensIn, amountsIn);
    });

    it('should join - join with ETH', async () => {
      const tokensIn = pool.tokensList.map((token) =>
        token ===
        networkConfig.addresses.tokens.wrappedNativeAsset.toLowerCase()
          ? AddressZero
          : token
      );
      const ethIndex = tokensIn.indexOf(AddressZero);
      const amountsIn = Array(tokensIn.length).fill('0');
      amountsIn[ethIndex] = parseFixed('1', 18).toString();
      testExactTokensIn(pool, signer, signerAddress, tokensIn, amountsIn);
    });
  });

  context('Unit Tests', async () => {
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
  });
});
