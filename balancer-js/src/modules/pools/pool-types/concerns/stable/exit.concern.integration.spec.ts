// yarn test:only ./src/modules/pools/pool-types/concerns/stable/exit.concern.integration.spec.ts
import dotenv from 'dotenv';
import { expect } from 'chai';
import { Network, PoolWithMethods } from '@/.';
import hardhat from 'hardhat';
import { BigNumber, parseFixed } from '@ethersproject/bignumber';
import {
  forkSetup,
  sendTransactionGetBalances,
  TestPoolHelper,
} from '@/test/lib/utils';
import { BPT_DECIMALS, BPT_SLOT } from '@/lib/constants/config';
import { addSlippage, subSlippage } from '@/lib/utils/slippageHelper';

dotenv.config();

const { ALCHEMY_URL: jsonRpcUrl } = process.env;
const { ethers } = hardhat;

const rpcUrl = 'http://127.0.0.1:8545';
const network = Network.MAINNET;
const provider = new ethers.providers.JsonRpcProvider(rpcUrl, network);
const signer = provider.getSigner();

describe('exit stable pools execution', async () => {
  let signerAddress: string;
  let pool: PoolWithMethods;
  const initialBalance = '100000';
  const blockNumber = 14717479;
  const testPoolId =
    '0x06df3b2bbb68adc8b0e302443692037ed9f91b42000000000000000000000063';
  // Setup chain
  context('exitExactBPTIn', async () => {
    beforeEach(async function () {
      await forkSetup(
        signer,
        [testPoolId.slice(0, 42)],
        [BPT_SLOT],
        [parseFixed(initialBalance, 18).toString()],
        jsonRpcUrl as string,
        blockNumber // holds the same state as the static repository
      );
      const testPool = new TestPoolHelper(
        testPoolId,
        network,
        rpcUrl,
        blockNumber
      );
      //updated pool, getting the pool info from the reseted fork with forkSetup
      pool = await testPool.getPool();
      signerAddress = await signer.getAddress();
    });
    it('should work with single token maxed out', async () => {
      const bptIn = parseFixed('10', BPT_DECIMALS).toString();
      const slippage = '100';
      const { to, data, minAmountsOut, expectedAmountsOut } =
        pool.buildExitExactBPTIn(
          signerAddress,
          bptIn,
          slippage,
          false,
          pool.tokensList[0]
        );
      const { transactionReceipt, balanceDeltas } =
        await sendTransactionGetBalances(
          [pool.address, ...pool.tokensList],
          signer,
          signerAddress,
          to,
          data
        );
      expect(transactionReceipt.status).to.eql(1);
      expect([bptIn, ...expectedAmountsOut]).to.deep.eq(
        balanceDeltas.map((a) => a.toString())
      );
      const expectedMins = expectedAmountsOut.map((a) =>
        subSlippage(BigNumber.from(a), BigNumber.from(slippage)).toString()
      );
      expect(expectedMins).to.deep.eq(minAmountsOut);
    });
    it('should work with proportional amounts out', async () => {
      const bptIn = parseFixed('1', BPT_DECIMALS).toString();
      const slippage = '0';
      const { to, data, minAmountsOut, expectedAmountsOut } =
        pool.buildExitExactBPTIn(signerAddress, bptIn, slippage);
      const { transactionReceipt, balanceDeltas } =
        await sendTransactionGetBalances(
          [pool.address, ...pool.tokensList],
          signer,
          signerAddress,
          to,
          data
        );
      const expectedMins = expectedAmountsOut.map((a) =>
        subSlippage(BigNumber.from(a), BigNumber.from(slippage)).toString()
      );
      expect(expectedMins).to.deep.eq(minAmountsOut);
      expect(transactionReceipt.status).to.eql(1);
      expect([bptIn, ...expectedAmountsOut]).to.deep.eq(
        balanceDeltas.map((a) => a.toString())
      );
    });
  });

  context('exitExactTokensOut', async () => {
    beforeEach(async function () {
      await forkSetup(
        signer,
        [testPoolId.slice(0, 42)],
        [BPT_SLOT],
        [parseFixed(initialBalance, 18).toString()],
        jsonRpcUrl as string,
        blockNumber // holds the same state as the static repository
      );
      const testPool = new TestPoolHelper(
        testPoolId,
        network,
        rpcUrl,
        blockNumber
      );
      //updated pool, getting the pool info from the reseted fork with forkSetup
      pool = await testPool.getPool();
      signerAddress = await signer.getAddress();
    });
    // Setup chain
    beforeEach(async function () {
      const testPool = new TestPoolHelper(
        testPoolId,
        network,
        rpcUrl,
        blockNumber
      );
      pool = await testPool.getPool();
      await forkSetup(
        signer,
        [pool.address],
        [BPT_SLOT],
        [parseFixed(initialBalance, 18).toString()],
        jsonRpcUrl as string,
        14717479 // holds the same state as the static repository
      );
      signerAddress = await signer.getAddress();
    });
    it('should work with all tokens out', async () => {
      const tokensOut = pool.tokensList;
      const amountsOut = pool.tokens.map((t, i) =>
        parseFixed((i * 100).toString(), t.decimals).toString()
      );
      const slippage = '1';
      const { to, data, maxBPTIn, expectedBPTIn } =
        pool.buildExitExactTokensOut(
          signerAddress,
          tokensOut,
          amountsOut,
          slippage
        );
      const { transactionReceipt, balanceDeltas } =
        await sendTransactionGetBalances(
          [pool.address, ...pool.tokensList],
          signer,
          signerAddress,
          to,
          data
        );
      expect(transactionReceipt.status).to.eql(1);
      expect([expectedBPTIn, ...amountsOut]).to.deep.eq(
        balanceDeltas.map((a) => a.toString())
      );
      const expectedMaxBPTIn = addSlippage(
        BigNumber.from(expectedBPTIn),
        BigNumber.from(slippage)
      ).toString();
      expect(expectedMaxBPTIn).to.deep.eq(maxBPTIn);
    });
    it('should work for a single token out', async () => {
      const tokensOut = pool.tokensList;
      const amountsOut = pool.tokens.map((t, i) => {
        if (i === 0) {
          return parseFixed('100', t.decimals).toString();
        }
        return '0';
      });
      const slippage = '1';
      const { to, data, expectedBPTIn } = pool.buildExitExactTokensOut(
        signerAddress,
        tokensOut,
        amountsOut,
        slippage
      );
      const { transactionReceipt, balanceDeltas } =
        await sendTransactionGetBalances(
          [pool.address, ...pool.tokensList],
          signer,
          signerAddress,
          to,
          data
        );
      expect(transactionReceipt.status).to.eql(1);
      expect([expectedBPTIn, ...amountsOut]).to.deep.eq(
        balanceDeltas.map((a) => a.toString())
      );
    });
    it('should automatically sort tokens/amounts in correct order', async () => {
      const tokensOut = pool.tokensList;
      const amountsOut = pool.tokens.map((t, i) =>
        parseFixed((i * 100).toString(), t.decimals).toString()
      );
      const slippage = '10';
      // TokensIn are already ordered as required by vault
      const attributesA = pool.buildExitExactTokensOut(
        signerAddress,
        tokensOut,
        amountsOut,
        slippage
      );
      // TokensIn are not ordered as required by vault and will be sorted correctly
      const attributesB = pool.buildExitExactTokensOut(
        signerAddress,
        tokensOut.reverse(),
        amountsOut.reverse(),
        slippage
      );
      expect(attributesA).to.deep.eq(attributesB);
    });
  });
});
