// yarn test:only ./src/modules/pools/pool-types/concerns/composableStable/exitV1.concern.integration.spec.ts
import dotenv from 'dotenv';
import { ethers } from 'hardhat';
import { parseFixed } from '@ethersproject/bignumber';
import {
  BALANCER_NETWORK_CONFIG,
  getPoolAddress,
  Network,
  Pools,
  PoolWithMethods,
  removeItem,
} from '@/.';
import { forkSetup, getPoolFromFile, updateFromChain } from '@/test/lib/utils';
import {
  testExactBptIn,
  testExactTokensOut,
  testRecoveryExit,
} from '@/test/lib/exitHelper';
import { TEST_BLOCK } from '@/test/lib/constants';

dotenv.config();

const network = Network.MAINNET;
const { ALCHEMY_URL: jsonRpcUrl } = process.env;
const rpcUrl = 'http://127.0.0.1:8545';
const provider = new ethers.providers.JsonRpcProvider(rpcUrl, network);
const signer = provider.getSigner();
const blockNumber = TEST_BLOCK[network];
const testPoolId =
  '0xa13a9247ea42d743238089903570127dda72fe4400000000000000000000035d';
let pool: PoolWithMethods;

describe('ComposableStableV1 Exits', () => {
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
    // Update pool info with onchain state from fork block no
    testPool = await updateFromChain(testPool, network, provider);

    pool = Pools.wrap(testPool, BALANCER_NETWORK_CONFIG[network]);
  });
  context('exitExactBPTIn', async () => {
    it('single token max out', async () => {
      const bptIn = parseFixed('10', 18).toString();
      const tokenOut = pool.tokensList[1];
      await testExactBptIn(pool, signer, bptIn, tokenOut);
    });
    it('single token max out, token out after BPT index', async () => {
      const bptIn = parseFixed('10', 18).toString();
      const tokenOut = pool.tokensList[3];
      await testExactBptIn(pool, signer, bptIn, tokenOut);
    });
  });

  context('exitExactTokensOut', async () => {
    it('all tokens with value', async () => {
      const tokensOut = removeItem(pool.tokensList, pool.bptIndex);
      const amountsOut = tokensOut.map((_, i) =>
        parseFixed(((i + 1) * 100).toString(), 18).toString()
      );
      await testExactTokensOut(pool, signer, tokensOut, amountsOut);
    });
    it('single token with value', async () => {
      const tokensOut = removeItem(pool.tokensList, pool.bptIndex);
      const amountsOut = Array(tokensOut.length).fill('0');
      amountsOut[0] = parseFixed('202', 18).toString();
      await testExactTokensOut(pool, signer, tokensOut, amountsOut);
    });
    it('single token with value, token out after BPT index', async () => {
      const tokensOut = removeItem(pool.tokensList, pool.bptIndex);
      const amountsOut = Array(tokensOut.length).fill('0');
      amountsOut[2] = parseFixed('202', 18).toString();
      await testExactTokensOut(pool, signer, tokensOut, amountsOut);
    });
  });
  context('buildRecoveryExit', async () => {
    it('proportional exit', async () => {
      const bptIn = parseFixed('10', 18).toString();
      await testRecoveryExit(pool, signer, bptIn);
    });

    it('proportional exit - to internal balance', async () => {
      const bptIn = parseFixed('10', 18).toString();
      await testRecoveryExit(pool, signer, bptIn, true);
    });
  });
});
