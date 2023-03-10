// yarn test:only ./src/modules/pools/pool-types/concerns/composableStable/exitV2.concern.integration.spec.ts
import dotenv from 'dotenv';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { BigNumber, formatFixed, parseFixed } from '@ethersproject/bignumber';
import {
  getPoolAddress,
  insert,
  Network,
  PoolWithMethods,
  removeItem,
} from '@/.';
import { subSlippage, addSlippage } from '@/lib/utils/slippageHelper';
import {
  forkSetup,
  TestPoolHelper,
  sendTransactionGetBalances,
} from '@/test/lib/utils';

dotenv.config();

const network = Network.POLYGON;
const { ALCHEMY_URL_POLYGON: jsonRpcUrl } = process.env;
const rpcUrl = 'http://127.0.0.1:8137';
const provider = new ethers.providers.JsonRpcProvider(rpcUrl, network);
const signer = provider.getSigner();
const testPoolId =
  '0x373b347bc87998b151a5e9b6bb6ca692b766648a000000000000000000000923';
const blockNumber = 40178348;
let signerAddress: string;
let pool: PoolWithMethods;

describe('ComposableStableV2 Exits', () => {
  before(async () => {
    signerAddress = await signer.getAddress();
  });
  // We have to rest the fork between each test as pool value changes after tx is submitted
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

    const testPool = new TestPoolHelper(
      testPoolId,
      network,
      rpcUrl,
      blockNumber
    );

    // Updatate pool info with onchain state from fork block no
    pool = await testPool.getPool();
  });

  context('exitExactBPTIn', async () => {
    const testExactBptIn = async (bptIn: string, tokenOut?: string) => {
      const slippage = '10'; // 10 bps = 0.1%

      const { to, data, minAmountsOut, expectedAmountsOut, priceImpact } =
        pool.buildExitExactBPTIn(
          signerAddress,
          bptIn,
          slippage,
          false,
          tokenOut
        );

      const { transactionReceipt, balanceDeltas } =
        await sendTransactionGetBalances(
          pool.tokensList,
          signer,
          signerAddress,
          to,
          data
        );

      expect(transactionReceipt.status).to.eq(1);
      const expectedDeltas = insert(expectedAmountsOut, pool.bptIndex, bptIn);
      expect(expectedDeltas).to.deep.eq(balanceDeltas.map((a) => a.toString()));
      const expectedMins = expectedAmountsOut.map((a) =>
        subSlippage(BigNumber.from(a), BigNumber.from(slippage)).toString()
      );
      expect(expectedMins).to.deep.eq(minAmountsOut);
      const priceImpactFloat = parseFloat(
        formatFixed(BigNumber.from(priceImpact), 18)
      );
      expect(priceImpactFloat).to.be.closeTo(0, 0.001); // exiting balanced stable pools with small amounts should have price impact near zero
    };

    it('single token max out', async () => {
      const bptIn = parseFixed('0.00001', 18).toString();
      const tokenOut = pool.tokensList[0];
      await testExactBptIn(bptIn, tokenOut);
    });
    it('single token max out, token out after BPT index', async () => {
      const bptIn = parseFixed('0.00001', 18).toString();
      const tokenOut = pool.tokensList[2];
      await testExactBptIn(bptIn, tokenOut);
    });
    it('proportional exit', async () => {
      const bptIn = parseFixed('0.00001', 18).toString();
      await testExactBptIn(bptIn);
    });
  });

  context('exitExactTokensOut', async () => {
    const testExactTokensOut = async (
      tokensOut: string[],
      amountsOut: string[]
    ) => {
      const slippage = '10'; // 10 bps = 0.1%

      const { to, data, maxBPTIn, expectedBPTIn, priceImpact } =
        pool.buildExitExactTokensOut(
          signerAddress,
          tokensOut,
          amountsOut,
          slippage
        );

      const { transactionReceipt, balanceDeltas } =
        await sendTransactionGetBalances(
          pool.tokensList,
          signer,
          signerAddress,
          to,
          data
        );

      expect(transactionReceipt.status).to.eq(1);
      const expectedDeltas = insert(amountsOut, pool.bptIndex, expectedBPTIn);
      expect(expectedDeltas).to.deep.eq(balanceDeltas.map((a) => a.toString()));
      const expectedMaxBpt = addSlippage(
        BigNumber.from(expectedBPTIn),
        BigNumber.from(slippage)
      ).toString();
      expect(expectedMaxBpt).to.deep.eq(maxBPTIn);
      const priceImpactFloat = parseFloat(
        formatFixed(BigNumber.from(priceImpact), 18)
      );
      expect(priceImpactFloat).to.be.closeTo(0, 0.001); // exiting balanced stable pools with small amounts should have price impact near zero
    };
    it('all tokens with value', async () => {
      const tokensOut = removeItem(pool.tokensList, pool.bptIndex);
      const amountsOut = tokensOut.map((_, i) =>
        parseFixed(((i + 1) * 0.00001).toString(), 18).toString()
      );
      await testExactTokensOut(tokensOut, amountsOut);
    });
    it('single token with value', async () => {
      const tokensOut = removeItem(pool.tokensList, pool.bptIndex);
      const amountsOut = Array(tokensOut.length).fill('0');
      amountsOut[0] = parseFixed('0.00001', 18).toString();
      await testExactTokensOut(tokensOut, amountsOut);
    });
    it('single token with value, token out after BPT index', async () => {
      const tokensOut = removeItem(pool.tokensList, pool.bptIndex);
      const amountsOut = Array(tokensOut.length).fill('0');
      amountsOut[1] = parseFixed('0.00001', 18).toString();
      await testExactTokensOut(tokensOut, amountsOut);
    });
  });
});
