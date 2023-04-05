import { PoolWithMethods } from '@/types';
import { JsonRpcSigner } from '@ethersproject/providers';
import { BigNumber } from '@ethersproject/bignumber';
import { expect } from 'chai';
import { formatFixed } from '@ethersproject/bignumber';
import { addSlippage, subSlippage } from '@/lib/utils/slippageHelper';
import { sendTransactionGetBalances } from '@/test/lib/utils';
import { insert } from '@/lib/utils';
import { formatEther } from '@ethersproject/units';

export const testExactBptIn = async (
  pool: PoolWithMethods,
  signer: JsonRpcSigner,
  bptIn: string,
  tokenOut?: string
): Promise<void> => {
  const slippage = '20'; // 20 bps = 0.2% - this is a high slippage to differences between static call and actual transaction
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
  // Allow for rounding errors - this has to be fixed on the SOR side in order to be 100% accurate
  expectedDeltas.forEach((expectedDelta, i) => {
    const delta = Number(formatEther(balanceDeltas[i].sub(expectedDelta)));
    expect(delta).to.be.closeTo(0, 1);
  });
  const expectedMins = expectedAmountsOut.map((a) =>
    subSlippage(BigNumber.from(a), BigNumber.from(slippage)).toString()
  );
  expect(expectedMins).to.deep.eq(minAmountsOut);
  const priceImpactFloat = parseFloat(
    formatFixed(BigNumber.from(priceImpact), 18)
  );
  expect(priceImpactFloat).to.be.closeTo(0, 0.01); // exiting balanced stable pools with small amounts should have price impact near zero
};

export const testExactTokensOut = async (
  pool: PoolWithMethods,
  signer: JsonRpcSigner,
  tokensOut: string[],
  amountsOut: string[]
): Promise<void> => {
  const slippage = '20'; // 20 bps = 0.2% - below it prediction fails with 207 - not enough bptIn
  const signerAddress = await signer.getAddress();

  const { to, data, maxBPTIn, expectedBPTIn, priceImpact } =
    pool.buildExitExactTokensOut(
      signerAddress,
      tokensOut,
      amountsOut,
      slippage
    );

  const tokensToBeChecked =
    pool.bptIndex !== -1
      ? insert(tokensOut, pool.bptIndex, pool.address)
      : tokensOut;

  const { transactionReceipt, balanceDeltas } =
    await sendTransactionGetBalances(
      tokensToBeChecked,
      signer,
      signerAddress,
      to,
      data
    );

  expect(transactionReceipt.status).to.eq(1);
  const expectedDeltas = insert(amountsOut, pool.bptIndex, expectedBPTIn);
  // Allow for rounding errors - this has to be fixed on the SOR side in order to be 100% accurate
  expectedDeltas.forEach((expectedDelta, i) => {
    const delta = Number(formatEther(balanceDeltas[i].sub(expectedDelta)));
    expect(delta).to.be.closeTo(0, 1);
  });
  const expectedMaxBpt = addSlippage(
    BigNumber.from(expectedBPTIn),
    BigNumber.from(slippage)
  ).toString();
  expect(expectedMaxBpt).to.deep.eq(maxBPTIn);
  const priceImpactFloat = parseFloat(
    formatFixed(BigNumber.from(priceImpact), 18)
  );
  expect(priceImpactFloat).to.be.closeTo(0, 0.01); // exiting balanced stable pools with small amounts should have price impact near zero
};

export const testRecoveryExit = async (
  pool: PoolWithMethods,
  signer: JsonRpcSigner,
  bptIn: string
): Promise<void> => {
  const slippage = '10'; // 10 bps = 0.1%
  const signerAddress = await signer.getAddress();

  const { to, data, minAmountsOut, expectedAmountsOut, priceImpact } =
    pool.buildRecoveryExit(signerAddress, bptIn, slippage);

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
  // Allow for rounding errors - this has to be fixed on the SOR side in order to be 100% accurate
  expectedDeltas.forEach((expectedDelta, i) => {
    expect(balanceDeltas[i].sub(expectedDelta).toNumber()).to.be.closeTo(0, 1);
  });
  const expectedMins = expectedAmountsOut.map((a) =>
    subSlippage(BigNumber.from(a), BigNumber.from(slippage)).toString()
  );
  expect(expectedMins).to.deep.eq(minAmountsOut);
  const priceImpactFloat = parseFloat(
    formatFixed(BigNumber.from(priceImpact), 18)
  );
  expect(priceImpactFloat).to.be.closeTo(0, 0.01); // exiting proportionally should have price impact near zero
};
