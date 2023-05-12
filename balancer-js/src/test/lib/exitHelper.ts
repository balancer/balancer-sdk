import { JsonRpcSigner } from '@ethersproject/providers';
import { BigNumber } from '@ethersproject/bignumber';
import { formatFixed } from '@ethersproject/bignumber';
import { expect } from 'chai';

import { truncateAddresses, removeItem, SimulationType } from '@/.';
import { insert, addSlippage, subSlippage } from '@/lib/utils';
import { Contracts } from '@/modules/contracts/contracts.module';
import { Pools } from '@/modules/pools';
import { Relayer } from '@/modules/relayer/relayer.module';
import { accuracy, sendTransactionGetBalances } from '@/test/lib/utils';
import { PoolWithMethods } from '@/types';

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
  toInternalBalance = false
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
  expect(priceImpactFloat).to.be.closeTo(0, 0.01); // exiting balanced stable pools with small amounts should have price impact near zero
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

export const testGeneralisedExit = async (
  pool: { id: string; address: string; slot: number },
  pools: Pools,
  signer: JsonRpcSigner,
  exitAmount: string,
  simulationType: SimulationType.Static | SimulationType.Tenderly,
  expectUnwrap = false
): Promise<{
  expectedAmountsOut: string[];
  gasUsed: BigNumber;
}> => {
  const slippage = '10'; // 10 bps = 0.1%

  const signerAddress = await signer.getAddress();
  const { contracts, contractAddresses } = new Contracts(
    signer.provider.network.chainId,
    signer.provider
  );

  // Replicating UI user flow:

  // 1. Gets exitInfo
  //    - this helps user to decide if they will approve relayer, etc by returning estimated amounts out/pi.
  //    - also returns tokensOut and whether or not unwrap should be used
  const exitInfo = await pools.getExitInfo(
    pool.id,
    exitAmount,
    signerAddress,
    signer
  );

  const authorisation = await Relayer.signRelayerApproval(
    contractAddresses.relayer,
    signerAddress,
    signer,
    contracts.vault
  );

  // 2. Get call data and expected/min amounts out
  //    - Uses a Static/Tenderly call to simulate tx then applies slippage
  const { to, encodedCall, tokensOut, expectedAmountsOut, minAmountsOut } =
    await pools.generalisedExit(
      pool.id,
      exitAmount,
      signerAddress,
      slippage,
      signer,
      simulationType,
      exitInfo.needsUnwrap,
      authorisation
    );

  // 3. Sends tx
  const { transactionReceipt, balanceDeltas, gasUsed } =
    await sendTransactionGetBalances(
      [pool.address, ...tokensOut],
      signer,
      signerAddress,
      to,
      encodedCall
    );

  const tokensOutDeltas = removeItem(balanceDeltas, 0);
  console.table({
    tokensOut: truncateAddresses(tokensOut),
    estimateAmountsOut: exitInfo.estimatedAmountsOut,
    minAmountsOut: minAmountsOut,
    expectedAmountsOut: expectedAmountsOut,
    balanceDeltas: tokensOutDeltas.map((b) => b.toString()),
  });
  console.log('Gas used', gasUsed.toString());
  console.log(`Should unwrap: `, exitInfo.needsUnwrap);

  expect(transactionReceipt.status).to.eq(1);
  expect(balanceDeltas[0].toString()).to.eq(exitAmount.toString());
  expect(exitInfo.needsUnwrap).to.eq(expectUnwrap);
  tokensOutDeltas.forEach((b, i) => {
    const minOut = BigNumber.from(minAmountsOut[i]);
    expect(b.gte(minOut)).to.be.true;
    expect(accuracy(b, BigNumber.from(expectedAmountsOut[i]))).to.be.closeTo(
      1,
      1e-2
    ); // inaccuracy should be less than 1%
  });
  const expectedMins = expectedAmountsOut.map((a) =>
    subSlippage(BigNumber.from(a), BigNumber.from(slippage)).toString()
  );
  expect(expectedMins).to.deep.eq(minAmountsOut);
  return { expectedAmountsOut, gasUsed };
};
