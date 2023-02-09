// yarn test:only ./src/modules/pools/pool-types/concerns/composableStable/exit.concern.integration.spec.ts
import dotenv from 'dotenv';
import { expect } from 'chai';
import { insert, Network, PoolWithMethods, removeItem } from '@/.';
import { JsonRpcSigner, TransactionReceipt } from '@ethersproject/providers';
import { BigNumber, parseFixed } from '@ethersproject/bignumber';
import {
  forkSetup,
  getBalances,
  getTestingRelevantParams,
} from '@/test/lib/utils';
import pools_16350000 from '@/test/lib/pools_16350000.json';
import { subSlippage, addSlippage } from '@/lib/utils/slippageHelper';

dotenv.config();

async function sendTransaction(
  tokensForBalanceCheck: string[],
  signer: JsonRpcSigner,
  signerAddress: string,
  to: string,
  data: string
): Promise<{
  transactionReceipt: TransactionReceipt;
  balanceDeltas: BigNumber[];
}> {
  const balanceBefore = await getBalances(
    tokensForBalanceCheck,
    signer,
    signerAddress
  );
  // Send transaction to local fork
  const transactionResponse = await signer.sendTransaction({
    to,
    data,
    gasLimit: 3000000,
  });
  const transactionReceipt = await transactionResponse.wait();
  const balancesAfter = await getBalances(
    tokensForBalanceCheck,
    signer,
    signerAddress
  );

  const balanceDeltas = balancesAfter.map((balAfter, i) => {
    return balAfter.sub(balanceBefore[i]).abs();
  });

  return {
    transactionReceipt,
    balanceDeltas,
  };
}

describe('exit composable stable pool v1 execution', async () => {
  const blockNumber = 16350000;
  let signer: JsonRpcSigner;
  let signerAddress: string;
  let pool: PoolWithMethods;

  // We have to rest the fork between each test as pool value changes after tx is submitted
  beforeEach(async () => {
    const testingParams = getTestingRelevantParams({
      network: Network.MAINNET,
      pools: pools_16350000,
      poolId:
        '0xa13a9247ea42d743238089903570127dda72fe4400000000000000000000035d',
      hasBPT: true,
    });

    signer = testingParams.signer;
    signerAddress = await testingParams.signer.getAddress();
    pool = testingParams.pool;

    // Setup forked network, set initial token balances and allowances
    await forkSetup(
      testingParams.signer,
      testingParams.poolObj.tokensList,
      Array(testingParams.poolObj.tokensList.length).fill(0),
      Array(testingParams.poolObj.tokensList.length).fill(
        parseFixed('100000', 18).toString()
      ),
      testingParams.jsonRpcUrl as string,
      blockNumber // holds the same state as the static repository
    );
  });

  context('exitExactBPTIn', async () => {
    it('single token max out', async () => {
      const bptIn = parseFixed('10', 18).toString();
      const slippage = BigNumber.from('10');
      const { to, data, minAmountsOut, expectedAmountsOut } =
        pool.buildExitExactBPTIn(
          signerAddress,
          bptIn,
          slippage.toString(),
          false,
          pool.tokensList[1]
        );
      const { transactionReceipt, balanceDeltas } = await sendTransaction(
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
        subSlippage(BigNumber.from(a), slippage).toString()
      );
      expect(expectedMins).to.deep.eq(minAmountsOut);
    });
  });

  context('exitExactTokensOut', async () => {
    it('all tokens with value', async () => {
      const tokensOut = removeItem(pool.tokensList, pool.bptIndex);
      const amountsOut = tokensOut.map((_, i) =>
        parseFixed((i * 100).toString(), 18).toString()
      );
      const slippage = BigNumber.from('7');
      const { to, data, maxBPTIn, expectedBPTIn } =
        pool.buildExitExactTokensOut(
          signerAddress,
          tokensOut,
          amountsOut,
          slippage.toString()
        );
      const { transactionReceipt, balanceDeltas } = await sendTransaction(
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
        slippage
      ).toString();
      expect(expectedMaxBpt).to.deep.eq(maxBPTIn);
    });
    it('single token with value', async () => {
      const tokensOut = removeItem(pool.tokensList, pool.bptIndex);
      const amountsOut = Array(tokensOut.length).fill('0');
      amountsOut[0] = parseFixed('202', 18).toString();
      const slippage = BigNumber.from('7');
      const { to, data, maxBPTIn, expectedBPTIn } =
        pool.buildExitExactTokensOut(
          signerAddress,
          tokensOut,
          amountsOut,
          slippage.toString()
        );
      const { transactionReceipt, balanceDeltas } = await sendTransaction(
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
        slippage
      ).toString();
      expect(expectedMaxBpt).to.deep.eq(maxBPTIn);
    });
  });
});
