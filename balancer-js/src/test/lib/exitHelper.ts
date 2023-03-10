import { PoolWithMethods } from '@/types';
import { JsonRpcSigner } from '@ethersproject/providers';
import { BigNumber } from '@ethersproject/bignumber';
import { expect } from 'chai';
import { formatFixed } from '@ethersproject/bignumber';
import { addSlippage, subSlippage } from '@/lib/utils/slippageHelper';
import { sendTransactionGetBalances } from '@/test/lib/utils';
import { insert } from '@/lib/utils';

export const testExactBptIn = async (
  pool: PoolWithMethods,
  signer: JsonRpcSigner,
  bptIn: string,
  tokenOut?: string
): Promise<void> => {
  const slippage = '10'; // 10 bps = 0.1%
  const signerAddress = await signer.getAddress();

  const { to, data, minAmountsOut, expectedAmountsOut, priceImpact } =
    pool.buildExitExactBPTIn(signerAddress, bptIn, slippage, false, tokenOut);

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

export const testExactTokensOut = async (
  pool: PoolWithMethods,
  signer: JsonRpcSigner,
  tokensOut: string[],
  amountsOut: string[]
): Promise<void> => {
  const slippage = '10'; // 10 bps = 0.1%
  const signerAddress = await signer.getAddress();

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
