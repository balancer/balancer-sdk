// yarn test:only ./src/modules/pools/pool-types/concerns/weighted/exitV1.concern.integration.spec.ts
import { BigNumber, parseFixed } from '@ethersproject/bignumber';
import dotenv from 'dotenv';
import { expect } from 'chai';
import { ethers } from 'hardhat';

import { BalancerSDK, insert, Network, PoolWithMethods, replace } from '@/.';
import { BPT_DECIMALS, BPT_SLOT } from '@/lib/constants/config';
import { addSlippage, subSlippage } from '@/lib/utils/slippageHelper';
import {
  forkSetup,
  sendTransactionGetBalances,
  TestPoolHelper,
} from '@/test/lib/utils';
import { AddressZero } from '@ethersproject/constants';

dotenv.config();

const { ALCHEMY_URL: jsonRpcUrl } = process.env;
const rpcUrl = 'http://127.0.0.1:8545';
const network = Network.MAINNET;
const sdk = new BalancerSDK({ network, rpcUrl });
const { networkConfig } = sdk;
const provider = new ethers.providers.JsonRpcProvider(rpcUrl, network);
const signer = provider.getSigner();

describe('Weighted Pool - Exit Integration Test', async () => {
  let signerAddress: string;
  let pool: PoolWithMethods;
  const initialBalance = '100000';
  // This blockNumber is before protocol fees were switched on (Oct `21), for blockNos after this tests will fail because results don't 100% match
  const blockNumber = 13309758;
  const testPoolId =
    '0x96646936b91d6b9d7d0c47c496afbf3d6ec7b6f8000200000000000000000019';
  // Setup chain
  context('exit pool functions', async () => {
    beforeEach(async function () {
      await forkSetup(
        signer,
        [testPoolId.slice(0, 42)],
        [BPT_SLOT],
        [parseFixed(initialBalance, 18).toString()],
        jsonRpcUrl as string,
        blockNumber
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
    context('buildExitExactBPTIn', async () => {
      it('should work with single token maxed out', async () => {
        const bptIn = parseFixed('10', BPT_DECIMALS).toString();
        const slippage = '0';
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
        expect(transactionReceipt.status).to.eq(1);
        const expectedDeltas = insert(expectedAmountsOut, 0, bptIn);
        expect(expectedDeltas).to.deep.eq(
          balanceDeltas.map((a) => a.toString())
        );
        const expectedMins = expectedAmountsOut.map((a) =>
          subSlippage(BigNumber.from(a), BigNumber.from(slippage)).toString()
        );
        expect(expectedMins).to.deep.eq(minAmountsOut);
      });
      it('should work with proportional amounts out', async () => {
        const bptIn = parseFixed('10', BPT_DECIMALS).toString();
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
        expect(transactionReceipt.status).to.eq(1);
        const expectedDeltas = insert(expectedAmountsOut, 0, bptIn);
        expect(expectedDeltas).to.deep.eq(
          balanceDeltas.map((a) => a.toString())
        );
        const expectedMins = expectedAmountsOut.map((a) =>
          subSlippage(BigNumber.from(a), BigNumber.from(slippage)).toString()
        );
        expect(expectedMins).to.deep.eq(minAmountsOut);
      });
    });

    context('buildExitExactTokensOut', async () => {
      it('all tokens with value', async () => {
        const tokensOut = pool.tokensList;
        const amountsOut = pool.tokens.map((t, i) =>
          parseFixed((i * 100).toString(), t.decimals).toString()
        );
        const slippage = '0';
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
        expect(transactionReceipt.status).to.eq(1);
        const expectedDeltas = insert(amountsOut, 0, expectedBPTIn);
        expect(expectedDeltas).to.deep.eq(
          balanceDeltas.map((a) => a.toString())
        );
        const expectedMaxBpt = addSlippage(
          BigNumber.from(expectedBPTIn),
          BigNumber.from(slippage)
        ).toString();
        expect(expectedMaxBpt).to.deep.eq(maxBPTIn);
      });
      it('single token with value', async () => {
        const tokensOut = pool.tokensList;
        const amountsOut = pool.tokens.map((t, i) => {
          if (i === 0) {
            return parseFixed('100', t.decimals).toString();
          }
          return '0';
        });
        const slippage = '0';
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
        expect(transactionReceipt.status).to.eq(1);
        const expectedDeltas = insert(amountsOut, 0, expectedBPTIn);
        expect(expectedDeltas).to.deep.eq(
          balanceDeltas.map((a) => a.toString())
        );
        const expectedMaxBpt = addSlippage(
          BigNumber.from(expectedBPTIn),
          BigNumber.from(slippage)
        ).toString();
        expect(expectedMaxBpt).to.deep.eq(maxBPTIn);
      });
      it('exit with ETH', async () => {
        const tokensOut = pool.tokensList.map((token) =>
          token ===
          networkConfig.addresses.tokens.wrappedNativeAsset.toLowerCase()
            ? AddressZero
            : token
        );
        const ethIndex = tokensOut.indexOf(AddressZero);
        const amountsOut = Array(tokensOut.length).fill('0');
        amountsOut[ethIndex] = parseFixed('1', 18).toString();
        const slippage = '0';
        const { to, data, maxBPTIn, expectedBPTIn } =
          pool.buildExitExactTokensOut(
            signerAddress,
            tokensOut,
            amountsOut,
            slippage
          );
        const { transactionReceipt, balanceDeltas, gasUsed } =
          await sendTransactionGetBalances(
            [pool.address, ...tokensOut],
            signer,
            signerAddress,
            to,
            data
          );
        expect(transactionReceipt.status).to.eq(1);
        const ethAmountOutWithGasUsed = BigNumber.from(amountsOut[ethIndex])
          .sub(gasUsed)
          .toString();
        const expectedBalanceDeltasWithGasUsed = replace(
          amountsOut,
          ethIndex,
          ethAmountOutWithGasUsed
        );
        const expectedDeltas = insert(
          expectedBalanceDeltasWithGasUsed,
          0,
          expectedBPTIn
        );
        expect(expectedDeltas).to.deep.eq(
          balanceDeltas.map((a) => a.toString())
        );
        const expectedMaxBpt = addSlippage(
          BigNumber.from(expectedBPTIn),
          BigNumber.from(slippage)
        ).toString();
        expect(expectedMaxBpt).to.deep.eq(maxBPTIn);
      });
    });
  });
});
