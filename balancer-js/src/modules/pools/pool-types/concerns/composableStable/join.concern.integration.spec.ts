// yarn test:only ./src/modules/pools/pool-types/concerns/composableStable/join.concern.integration.spec.ts
import dotenv from 'dotenv';
import { ethers } from 'hardhat';
import { parseFixed } from '@ethersproject/bignumber';

import {
  removeItem,
  PoolWithMethods,
  Network,
  replace,
  BALANCER_NETWORK_CONFIG,
} from '@/.';
import { forkSetup, TestPoolHelper } from '@/test/lib/utils';
import {
  testExactTokensIn,
  testAttributes,
  testSortingInputs,
} from '@/test/lib/joinHelper';
import { AddressZero } from '@ethersproject/constants';

dotenv.config();

const network = Network.POLYGON;
const { ALCHEMY_URL_POLYGON: jsonRpcUrl } = process.env;
const rpcUrl = 'http://127.0.0.1:8137';
const provider = new ethers.providers.JsonRpcProvider(rpcUrl, network);
const signer = provider.getSigner();
const blockNumber = 42505555;
const testPoolId =
  '0x02d2e2d7a89d6c5cb3681cfcb6f7dac02a55eda400000000000000000000088f';

describe('ComposableStable Pool - Join Functions', async () => {
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

    // Gets initial pool info from Subgraph
    pool = await testPoolHelper.getPool();
  });

  context('Integration Tests', async () => {
    // We have to rest the fork between each test as pool value changes after tx is submitted
    beforeEach(async () => {
      // Setup forked network, set initial token balances and allowances
      await forkSetup(
        signer,
        pool.tokensList,
        [0, 3, 0],
        Array(pool.tokensList.length).fill(parseFixed('100000', 18).toString()),
        jsonRpcUrl as string,
        blockNumber // holds the same state as the static repository
      );

      // Updatate pool info with onchain state from fork block no
      pool = await testPoolHelper.getPool();
    });

    it('should join - all tokens have value', async () => {
      const tokensIn = removeItem(pool.tokensList, pool.bptIndex);
      const amountsIn = tokensIn.map((_, i) =>
        parseFixed(((i + 1) * 100).toString(), 18).toString()
      );
      await testExactTokensIn(pool, signer, signerAddress, tokensIn, amountsIn);
    });

    it('should join - single token has value', async () => {
      const tokensIn = removeItem(pool.tokensList, pool.bptIndex);
      const amountsIn = Array(tokensIn.length).fill('0');
      amountsIn[0] = parseFixed('202', 18).toString();
      await testExactTokensIn(pool, signer, signerAddress, tokensIn, amountsIn);
    });

    it('should join - native asset', async () => {
      const wrappedNativeAssetIndex = pool.tokensList.indexOf(
        BALANCER_NETWORK_CONFIG[
          network
        ].addresses.tokens.wrappedNativeAsset.toLowerCase()
      );
      const tokensIn = removeItem(
        replace(pool.tokensList, wrappedNativeAssetIndex, AddressZero),
        pool.bptIndex
      );
      const amountsIn = Array(tokensIn.length).fill('0');
      amountsIn[wrappedNativeAssetIndex] = parseFixed('202', 18).toString();
      await testExactTokensIn(pool, signer, signerAddress, tokensIn, amountsIn);
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
