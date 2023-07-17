// yarn test:only ./src/modules/pools/pool-types/concerns/composableStable/exitV3.concern.integration.spec.ts
import dotenv from 'dotenv';
import { parseFixed } from '@ethersproject/bignumber';
import { JsonRpcProvider } from '@ethersproject/providers';
import {
  BALANCER_NETWORK_CONFIG,
  getPoolAddress,
  Network,
  Pools,
  PoolWithMethods,
  removeItem,
} from '@/.';
import { forkSetup, getPoolFromFile, updateFromChain } from '@/test/lib/utils';
import { testExactBptIn, testExactTokensOut } from '@/test/lib/exitHelper';
import { TEST_BLOCK } from '@/test/lib/constants';

dotenv.config();

const network = Network.MAINNET;
const { ALCHEMY_URL: jsonRpcUrl } = process.env;
const rpcUrl = 'http://127.0.0.1:8545';
const provider = new JsonRpcProvider(rpcUrl, network);
const signer = provider.getSigner();
const blockNumber = TEST_BLOCK[network];

// wstETH-rETH-sfrxETH-BPT
const testPoolId =
  '0x5aee1e99fe86960377de9f88689616916d5dcabe000000000000000000000467';
let pool: PoolWithMethods;

describe('ComposableStableV3 Exits', () => {
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
    // Updatate pool info with onchain state from fork block no
    testPool = await updateFromChain(testPool, network, provider);

    pool = Pools.wrap(testPool, BALANCER_NETWORK_CONFIG[network]);
  });
  context('exitExactBPTIn', async () => {
    it('single token max out', async () => {
      const bptIn = parseFixed('0.1', 18).toString();
      const tokenOut = pool.tokensList[0];
      await testExactBptIn(pool, signer, bptIn, tokenOut);
    });
    it('single token max out, token out after BPT index', async () => {
      const bptIn = parseFixed('0.1', 18).toString();
      const tokenOut = pool.tokensList[2];
      await testExactBptIn(pool, signer, bptIn, tokenOut);
    });
    it('proportional exit', async () => {
      const bptIn = parseFixed('0.1', 18).toString();
      await testExactBptIn(pool, signer, bptIn);
    });
  });

  context('exitExactTokensOut', async () => {
    it('all tokens with value', async () => {
      const tokensOut = removeItem(pool.tokensList, pool.bptIndex);
      const amountsOut = tokensOut.map((_, i) =>
        parseFixed(((i + 1) * 0.1).toString(), 18).toString()
      );
      await testExactTokensOut(pool, signer, tokensOut, amountsOut);
    });
    it('single token with value', async () => {
      const tokensOut = removeItem(pool.tokensList, pool.bptIndex);
      const amountsOut = Array(tokensOut.length).fill('0');
      amountsOut[0] = parseFixed('0.1', 18).toString();
      await testExactTokensOut(pool, signer, tokensOut, amountsOut);
    });
    it('single token with value, token out after BPT index', async () => {
      const tokensOut = removeItem(pool.tokensList, pool.bptIndex);
      const amountsOut = Array(tokensOut.length).fill('0');
      amountsOut[2] = parseFixed('0.1', 18).toString();
      await testExactTokensOut(pool, signer, tokensOut, amountsOut);
    });
  });
});
