// yarn test:only ./src/modules/pools/pool-types/concerns/metaStable/join.concern.integration.spec.ts
import { parseFixed } from '@ethersproject/bignumber';
import dotenv from 'dotenv';
import hardhat from 'hardhat';
import { Network, PoolWithMethods, removeItem } from '@/.';
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
  '0x32296969ef14eb0c6d29669c550d4a0449130230000200000000000000000080';
// Slots used to set the account balance for each token through hardhat_setStorageAt
// Info fetched using npm package slot20
const slots = [ADDRESSES[network].wSTETH.slot, ADDRESSES[network].WETH.slot];

describe('MetaStable Pool - Join Functions', async () => {
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
        parseFixed((100 * (i + 1)).toString(), decimals).toString()
      );
      testExactTokensIn(pool, signer, signerAddress, tokensIn, amountsIn);
    });

    it('should join - single token has value', async () => {
      const tokensIn = pool.tokensList;
      const amountsIn = Array(tokensIn.length).fill('0');
      amountsIn[0] = parseFixed('301', 18).toString();
      testExactTokensIn(pool, signer, signerAddress, tokensIn, amountsIn);
    });
  });

  context('Unit Tests', () => {
    it('should return correct attributes for joining', () => {
      const tokensIn = removeItem(pool.tokensList, pool.bptIndex);
      const amountsIn = tokensIn.map((_, i) =>
        parseFixed(((i + 1) * 100).toString(), 18).toString()
      );
      testAttributes(pool, testPoolId, signerAddress, tokensIn, amountsIn);
    });

    it('should automatically sort tokens/amounts in correct order', () => {
      const tokensIn = removeItem(pool.tokensList, pool.bptIndex);
      const amountsIn = tokensIn.map((_, i) =>
        parseFixed(((i + 1) * 100).toString(), 18).toString()
      );
      testSortingInputs(pool, signerAddress, tokensIn, amountsIn);
    });
  });
});
