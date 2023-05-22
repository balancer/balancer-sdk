// yarn test:only ./src/modules/pools/pool-types/concerns/composableStable/join.concern.integration.spec.ts
import { parseFixed } from '@ethersproject/bignumber';
import { JsonRpcProvider, JsonRpcSigner } from '@ethersproject/providers';

import {
  removeItem,
  PoolWithMethods,
  Network,
  replace,
  BALANCER_NETWORK_CONFIG,
} from '@/.';
import {
  FORK_NODES,
  forkSetup,
  RPC_URLS,
  TestPoolHelper,
} from '@/test/lib/utils';
import {
  testExactTokensIn,
  testAttributes,
  testSortingInputs,
} from '@/test/lib/joinHelper';
import { AddressZero } from '@ethersproject/constants';

describe('ComposableStable Pool - Join Functions', async () => {
  let signerAddress: string;
  let pool: PoolWithMethods;
  let testPoolHelper: TestPoolHelper;
  let network: Network;
  let jsonRpcUrl: string;
  let rpcUrl: string;
  let provider: JsonRpcProvider;
  let signer: JsonRpcSigner;
  let blockNumber: number;
  let testPoolId: string;

  context('Integration Tests - Join V1', async () => {
    before(async () => {
      network = Network.POLYGON;
      rpcUrl = RPC_URLS[network];
      provider = new JsonRpcProvider(rpcUrl, network);
      signer = provider.getSigner();
      signerAddress = await signer.getAddress();
      jsonRpcUrl = FORK_NODES[network];
      blockNumber = 42745087;
      testPoolId =
        '0x02d2e2d7a89d6c5cb3681cfcb6f7dac02a55eda400000000000000000000088f';

      testPoolHelper = new TestPoolHelper(
        testPoolId,
        network,
        rpcUrl,
        blockNumber
      );

      // Gets initial pool info from Subgraph
      pool = await testPoolHelper.getPool();
    });

    // We have to rest the fork between each test as pool value changes after tx is submitted
    beforeEach(async () => {
      // Setup forked network, set initial token balances and allowances
      await forkSetup(
        signer,
        pool.tokensList,
        [0, 3, 0],
        Array(pool.tokensList.length).fill(parseFixed('100000', 18).toString()),
        jsonRpcUrl,
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

  context('Integration Tests - Join V4', async () => {
    beforeEach(async () => {
      network = Network.MAINNET;
      rpcUrl = RPC_URLS[network];
      provider = new JsonRpcProvider(rpcUrl, network);
      signer = provider.getSigner();
      signerAddress = await signer.getAddress();
      jsonRpcUrl = FORK_NODES[network];
      blockNumber = 17280000;
      testPoolId =
        '0xd61e198e139369a40818fe05f5d5e6e045cd6eaf000000000000000000000540';

      testPoolHelper = new TestPoolHelper(
        testPoolId,
        network,
        rpcUrl,
        blockNumber
      );

      // Gets initial pool info from Subgraph
      pool = await testPoolHelper.getPool();
    });

    // We have to rest the fork between each test as pool value changes after tx is submitted
    beforeEach(async () => {
      // Setup forked network, set initial token balances and allowances
      await forkSetup(
        signer,
        pool.tokensList,
        [0, 5, 0],
        Array(pool.tokensList.length).fill(parseFixed('10', 18).toString()),
        jsonRpcUrl,
        blockNumber, // holds the same state as the static repository
        [false, true, false]
      );

      // Updatate pool info with onchain state from fork block no
      pool = await testPoolHelper.getPool();
    });

    it('should join - all tokens have value', async () => {
      const tokensIn = removeItem(pool.tokensList, pool.bptIndex);
      const amountsIn = tokensIn.map((_, i) =>
        parseFixed(((i + 1) * 0.1).toString(), 18).toString()
      );
      await testExactTokensIn(pool, signer, signerAddress, tokensIn, amountsIn);
    });

    it('should join - single token has value', async () => {
      const tokensIn = removeItem(pool.tokensList, pool.bptIndex);
      const amountsIn = Array(tokensIn.length).fill('0');
      amountsIn[0] = parseFixed('0.202', 18).toString();
      await testExactTokensIn(pool, signer, signerAddress, tokensIn, amountsIn);
    });
  });

  context('Unit Tests', () => {
    it('should return correct attributes for joining', () => {
      const tokensIn = removeItem(pool.tokensList, pool.bptIndex);
      const amountsIn = tokensIn.map((_, i) =>
        parseFixed(((i + 1) * 0.1).toString(), 18).toString()
      );
      testAttributes(pool, testPoolId, signerAddress, tokensIn, amountsIn);
    });

    it('should automatically sort tokens/amounts in correct order', () => {
      const tokensIn = removeItem(pool.tokensList, pool.bptIndex);
      const amountsIn = tokensIn.map((_, i) =>
        parseFixed(((i + 1) * 0.1).toString(), 18).toString()
      );
      testSortingInputs(pool, signerAddress, tokensIn, amountsIn);
    });
  });
});
