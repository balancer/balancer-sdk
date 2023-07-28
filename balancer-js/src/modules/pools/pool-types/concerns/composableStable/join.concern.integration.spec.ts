// yarn test:only ./src/modules/pools/pool-types/concerns/composableStable/join.concern.integration.spec.ts
import { parseFixed } from '@ethersproject/bignumber';
import { AddressZero } from '@ethersproject/constants';
import { JsonRpcProvider, JsonRpcSigner } from '@ethersproject/providers';

import {
  removeItem,
  PoolWithMethods,
  Network,
  replace,
  BALANCER_NETWORK_CONFIG,
  Pools,
  Pool,
} from '@/.';
import {
  FORK_NODES,
  forkSetup,
  getPoolFromFile,
  RPC_URLS,
  updateFromChain,
} from '@/test/lib/utils';
import {
  testExactTokensIn,
  testAttributes,
  testSortingInputs,
} from '@/test/lib/joinHelper';
import { TEST_BLOCK } from '@/test/lib/constants';

describe('ComposableStable Pool - Join Functions', async () => {
  let signerAddress: string;
  let pool: PoolWithMethods;
  let network: Network;
  let jsonRpcUrl: string;
  let rpcUrl: string;
  let provider: JsonRpcProvider;
  let signer: JsonRpcSigner;
  let blockNumber: number;
  let testPoolId: string;
  let testPool: Pool;

  context('Integration Tests - Join V1', async () => {
    before(async () => {
      network = Network.POLYGON;
      rpcUrl = RPC_URLS[network];
      provider = new JsonRpcProvider(rpcUrl, network);
      signer = provider.getSigner();
      signerAddress = await signer.getAddress();
      jsonRpcUrl = FORK_NODES[network];
      blockNumber = TEST_BLOCK[network];
      testPoolId =
        '0x02d2e2d7a89d6c5cb3681cfcb6f7dac02a55eda400000000000000000000088f';

      testPool = await getPoolFromFile(testPoolId, network);
    });

    // We have to reset the fork between each test as pool value changes after tx is submitted
    beforeEach(async () => {
      // Setup forked network, set initial token balances and allowances
      await forkSetup(
        signer,
        testPool.tokensList,
        [0, 3, 0],
        Array(testPool.tokensList.length).fill(
          parseFixed('100000', 18).toString()
        ),
        jsonRpcUrl,
        40818844
      );
      testPool = await updateFromChain(testPool, network, provider);
      pool = Pools.wrap(testPool, BALANCER_NETWORK_CONFIG[network]);
    });

    // The following tests are checking approx values because protocol fees not handled
    it('should join - all tokens have value', async () => {
      const tokensIn = removeItem(pool.tokensList, pool.bptIndex);
      const amountsIn = tokensIn.map((_, i) =>
        parseFixed(((i + 1) * 100).toString(), 18).toString()
      );
      await testExactTokensIn(
        pool,
        signer,
        signerAddress,
        tokensIn,
        amountsIn,
        true
      );
    });

    it('should join - single token has value', async () => {
      const tokensIn = removeItem(pool.tokensList, pool.bptIndex);
      const amountsIn = Array(tokensIn.length).fill('0');
      amountsIn[0] = parseFixed('202', 18).toString();
      await testExactTokensIn(
        pool,
        signer,
        signerAddress,
        tokensIn,
        amountsIn,
        true
      );
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
      await testExactTokensIn(
        pool,
        signer,
        signerAddress,
        tokensIn,
        amountsIn,
        true
      );
    });
  });

  context('Integration Tests - Join V4', async () => {
    before(async () => {
      network = Network.MAINNET;
      rpcUrl = RPC_URLS[network];
      provider = new JsonRpcProvider(rpcUrl, network);
      signer = provider.getSigner();
      signerAddress = await signer.getAddress();
      jsonRpcUrl = FORK_NODES[network];
      blockNumber = TEST_BLOCK[network];
      testPoolId =
        '0xd61e198e139369a40818fe05f5d5e6e045cd6eaf000000000000000000000540';
      testPool = await getPoolFromFile(testPoolId, network);
    });

    beforeEach(async () => {
      await forkSetup(
        signer,
        testPool.tokensList,
        [0, 5, 0],
        Array(testPool.tokensList.length).fill(parseFixed('10', 18).toString()),
        jsonRpcUrl,
        blockNumber, // holds the same state as the static repository
        [false, true, false]
      );

      testPool = await updateFromChain(testPool, network, provider);
      pool = Pools.wrap(testPool, BALANCER_NETWORK_CONFIG[network]);
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
    before(async () => {
      network = Network.MAINNET;
      rpcUrl = RPC_URLS[network];
      provider = new JsonRpcProvider(rpcUrl, network);
      signer = provider.getSigner();
      signerAddress = await signer.getAddress();
      testPoolId =
        '0xd61e198e139369a40818fe05f5d5e6e045cd6eaf000000000000000000000540';

      testPool = await getPoolFromFile(testPoolId, network);
      testPool = await updateFromChain(testPool, network, provider);
      pool = Pools.wrap(testPool, BALANCER_NETWORK_CONFIG[network]);
    });

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
