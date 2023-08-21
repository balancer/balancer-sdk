import { JsonRpcSigner } from '@ethersproject/providers';
import { BigNumber } from '@ethersproject/bignumber';
import { formatFixed } from '@ethersproject/bignumber';
import { expect } from 'chai';

import { insert, addSlippage, subSlippage } from '@/lib/utils';
import { accuracy, sendTransactionGetBalances } from '@/test/lib/utils';
import { PoolWithMethods, Pool } from '@/types';

export const testExactBptIn = async (
  pool: PoolWithMethods,
  signer: JsonRpcSigner,
  bptIn: string,
  tokenOut?: string,
  toInternalBalance = false
): Promise<void> => {
  const slippage = '20'; // 20 bps = 0.2% - this is a high slippage to differences between static call and actual transaction
  const signerAddress = await signer.getAddress();

  const { to, data, minAmountsOut, expectedAmountsOut, priceImpact } =
    pool.buildExitExactBPTIn(
      signerAddress,
      bptIn,
      slippage,
      false,
      tokenOut,
      toInternalBalance
    );

  const { transactionReceipt, balanceDeltas, internalBalanceDeltas } =
    await sendTransactionGetBalances(
      pool.tokensList,
      signer,
      signerAddress,
      to,
      data
    );

  expect(transactionReceipt.status).to.eq(1);
  const expectedDeltas = insert(expectedAmountsOut, pool.bptIndex, bptIn);
  expectedDeltas.forEach((expectedDelta, i) => {
    const balanceDelta = toInternalBalance
      ? balanceDeltas[i].add(internalBalanceDeltas[i])
      : balanceDeltas[i];
    // Allow up to 1% error due to protocol fees not being considered on SOR math
    const deltaAccuracy = accuracy(balanceDelta, BigNumber.from(expectedDelta));
    expect(deltaAccuracy).to.be.closeTo(1, 1e-2);
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
  amountsOut: string[],
  toInternalBalance = false,
  testPriceImpact = true
): Promise<void> => {
  const slippage = '20'; // 20 bps = 0.2% - below it prediction fails with 207 - not enough bptIn
  const signerAddress = await signer.getAddress();

  const { to, data, maxBPTIn, expectedBPTIn, priceImpact } =
    pool.buildExitExactTokensOut(
      signerAddress,
      tokensOut,
      amountsOut,
      slippage,
      toInternalBalance
    );

  const tokensToBeChecked =
    pool.bptIndex !== -1
      ? insert(tokensOut, pool.bptIndex, pool.address)
      : tokensOut;

  const { transactionReceipt, balanceDeltas, internalBalanceDeltas } =
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
    const balanceDelta = toInternalBalance
      ? balanceDeltas[i].add(internalBalanceDeltas[i])
      : balanceDeltas[i];
    // Allow up to 1% error due to protocol fees not being considered on SOR math
    const deltaAccuracy = accuracy(balanceDelta, BigNumber.from(expectedDelta));
    expect(deltaAccuracy).to.be.closeTo(1, 1e-2);
  });
  const expectedMaxBpt = addSlippage(
    BigNumber.from(expectedBPTIn),
    BigNumber.from(slippage)
  ).toString();
  expect(expectedMaxBpt).to.deep.eq(maxBPTIn);
  const priceImpactFloat = parseFloat(
    formatFixed(BigNumber.from(priceImpact), 18)
  );
  if (testPriceImpact) expect(priceImpactFloat).to.be.closeTo(0, 0.01); // exiting balanced stable pools with small amounts should have price impact near zero
};

export const testRecoveryExit = async (
  pool: PoolWithMethods,
  signer: JsonRpcSigner,
  bptIn: string,
  toInternalBalance = false
): Promise<void> => {
  const slippage = '10'; // 10 bps = 0.1%
  const signerAddress = await signer.getAddress();

  const { to, data, minAmountsOut, expectedAmountsOut, priceImpact } =
    pool.buildRecoveryExit(signerAddress, bptIn, slippage, toInternalBalance);

  await assertRecoveryExit(
    signerAddress,
    slippage,
    to,
    data,
    minAmountsOut,
    expectedAmountsOut,
    priceImpact,
    pool,
    signer,
    bptIn,
    toInternalBalance
  );
};

export const assertRecoveryExit = async (
  signerAddress: string,
  slippage: string,
  to: string,
  data: string,
  minAmountsOut: string[],
  expectedAmountsOut: string[],
  priceImpact: string,
  pool: Pool,
  signer: JsonRpcSigner,
  bptIn: string,
  toInternalBalance = false
): Promise<void> => {
  console.log(expectedAmountsOut.toString());
  const bptIndex = pool.tokensList.indexOf(pool.address);
  const { transactionReceipt, balanceDeltas, internalBalanceDeltas } =
    await sendTransactionGetBalances(
      bptIndex === -1 ? [...pool.tokensList, pool.address] : pool.tokensList,
      signer,
      signerAddress,
      to,
      data
    );
  expectedAmountsOut.forEach((amount) => expect(BigNumber.from(amount).gt(0)));

  expect(transactionReceipt.status).to.eq(1);
  const expectedDeltas =
    bptIndex === -1
      ? [...expectedAmountsOut, bptIn]
      : insert(expectedAmountsOut, bptIndex, bptIn);

  // Allow for rounding errors - this has to be fixed on the SOR side in order to be 100% accurate
  expectedDeltas.forEach((expectedDelta, i) => {
    const balanceDelta = toInternalBalance
      ? balanceDeltas[i].add(internalBalanceDeltas[i])
      : balanceDeltas[i];
    const delta = balanceDelta.sub(expectedDelta).toNumber();
    expect(delta).to.be.closeTo(0, 1);
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
