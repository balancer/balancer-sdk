// yarn test:only ./src/modules/pools/pool-types/concerns/composableStable/exitV2.concern.integration.spec.ts
import dotenv from 'dotenv';
import { ethers } from 'hardhat';
import { parseFixed } from '@ethersproject/bignumber';
import {
  BALANCER_NETWORK_CONFIG,
  getPoolAddress,
  Network,
  PoolWithMethods,
  removeItem,
  Pools,
} from '@/.';
import { forkSetup, getPoolFromFile, updateFromChain } from '@/test/lib/utils';
import {
  testExactBptIn,
  testExactTokensOut,
  testRecoveryExit,
} from '@/test/lib/exitHelper';
import { TEST_BLOCK } from '@/test/lib/constants';

dotenv.config();

const network = Network.POLYGON;
const { ALCHEMY_URL_POLYGON: jsonRpcUrl } = process.env;
const rpcUrl = 'http://127.0.0.1:8137';
const provider = new ethers.providers.JsonRpcProvider(rpcUrl, network);
const signer = provider.getSigner();
const testPoolId =
  '0x373b347bc87998b151a5e9b6bb6ca692b766648a000000000000000000000923';
const blockNumber = TEST_BLOCK[network];
let pool: PoolWithMethods;

describe('ComposableStableV2 Exits', () => {
  // We have to reset the fork between each test as pool value changes after tx is submitted
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

    let testPool = await getPoolFromFile(testPoolId, network);
    testPool = await updateFromChain(testPool, network, provider);

    // Updatate pool info with onchain state from fork block no
    pool = Pools.wrap(testPool, BALANCER_NETWORK_CONFIG[network]);
  });

  context('exitExactBPTIn', async () => {
    it('single token max out', async () => {
      const bptIn = parseFixed('0.00001', 18).toString();
      const tokenOut = pool.tokensList[0];
      await testExactBptIn(pool, signer, bptIn, tokenOut);
    });
    it('single token max out, token out after BPT index', async () => {
      const bptIn = parseFixed('0.00001', 18).toString();
      const tokenOut = pool.tokensList[2];
      await testExactBptIn(pool, signer, bptIn, tokenOut);
    });
    it('proportional exit', async () => {
      const bptIn = parseFixed('0.00001', 18).toString();
      await testExactBptIn(pool, signer, bptIn);
    });
  });

  context('exitExactTokensOut', async () => {
    it('all tokens with value', async () => {
      const tokensOut = removeItem(pool.tokensList, pool.bptIndex);
      const amountsOut = tokensOut.map((_, i) =>
        parseFixed(((i + 1) * 0.00001).toString(), 18).toString()
      );
      await testExactTokensOut(pool, signer, tokensOut, amountsOut);
    });
    it('single token with value', async () => {
      const tokensOut = removeItem(pool.tokensList, pool.bptIndex);
      const amountsOut = Array(tokensOut.length).fill('0');
      amountsOut[0] = parseFixed('0.00001', 18).toString();
      await testExactTokensOut(pool, signer, tokensOut, amountsOut);
    });
    it('single token with value, token out after BPT index', async () => {
      const tokensOut = removeItem(pool.tokensList, pool.bptIndex);
      const amountsOut = Array(tokensOut.length).fill('0');
      amountsOut[1] = parseFixed('0.00001', 18).toString();
      await testExactTokensOut(pool, signer, tokensOut, amountsOut);
    });
  });

  context('buildRecoveryExit', async () => {
    it('proportional exit', async () => {
      const bptIn = parseFixed('0.001', 18).toString();
      await testRecoveryExit(pool, signer, bptIn);
    });
  });
});
