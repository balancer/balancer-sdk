import { PoolWithMethods } from '@/types';
import { JsonRpcSigner } from '@ethersproject/providers';
import { BigNumber, formatFixed } from '@ethersproject/bignumber';
import { expect } from 'chai';

import { subSlippage } from '@/lib/utils/slippageHelper';
import { sendTransactionGetBalances } from '@/test/lib/utils';
import { insert } from '@/lib/utils';

export const testExactTokensIn = async (
  pool: PoolWithMethods,
  signer: JsonRpcSigner,
  signerAddress: string,
  tokensIn: string[],
  amountsIn: string[],
  approximate = false
): Promise<void> => {
  const slippage = '6'; // 6 bps = 0.06%

  const { to, data, minBPTOut, expectedBPTOut, priceImpact, value } =
    pool.buildJoin(signerAddress, tokensIn, amountsIn, slippage);

  const { transactionReceipt, balanceDeltas } =
    await sendTransactionGetBalances(
      pool.tokensList,
      signer,
      signerAddress,
      to,
      data,
      value
    );

  expect(transactionReceipt.status).to.eq(1);
  expect(BigInt(expectedBPTOut) > 0).to.be.true;
  const expectedDeltas = insert(amountsIn, pool.bptIndex, expectedBPTOut);
  if (approximate) {
    console.log(`!!!!!!! APPROX TEST`);
    const diffs = expectedDeltas.map((e, i) =>
      BigNumber.from(e).sub(balanceDeltas[i]).abs()
    );
    diffs.forEach((diff) => expect(diff.lt('100000000000000000')).to.be.true);
  } else
    expect(expectedDeltas).to.deep.eq(balanceDeltas.map((a) => a.toString()));
  const expectedMinBpt = subSlippage(
    BigNumber.from(expectedBPTOut),
    BigNumber.from(slippage)
  ).toString();
  expect(expectedMinBpt).to.deep.eq(minBPTOut);
  const priceImpactFloat = parseFloat(
    formatFixed(BigNumber.from(priceImpact), 18)
  );
  expect(priceImpactFloat).to.be.closeTo(0, 0.01); // joining balanced pool with small amounts should have price impact near zero
};

export const testAttributes = (
  pool: PoolWithMethods,
  poolId: string,
  signerAddress: string,
  tokensIn: string[],
  amountsIn: string[]
): void => {
  const slippage = '6'; // 6 bps = 0.06%

  const { attributes, functionName } = pool.buildJoin(
    signerAddress,
    tokensIn,
    amountsIn,
    slippage
  );

  expect(functionName).to.eq('joinPool');
  expect(attributes.poolId).to.eq(poolId);
  expect(attributes.recipient).to.eq(signerAddress);
  expect(attributes.sender).to.eq(signerAddress);
  expect(attributes.joinPoolRequest.assets).to.deep.eq(pool.tokensList);
  expect(attributes.joinPoolRequest.fromInternalBalance).to.be.false;
  expect(attributes.joinPoolRequest.maxAmountsIn).to.deep.eq(
    insert(amountsIn, pool.bptIndex, '0')
  );
};

export const testSortingInputs = (
  pool: PoolWithMethods,
  signerAddress: string,
  tokensIn: string[],
  amountsIn: string[]
): void => {
  const slippage = '6'; // 6 bps = 0.06%

  const attributesA = pool.buildJoin(
    signerAddress,
    tokensIn,
    amountsIn,
    slippage
  );
  // TokensIn are not ordered as required by vault and will be sorted correctly
  const attributesB = pool.buildJoin(
    signerAddress,
    tokensIn.reverse(),
    amountsIn.reverse(),
    slippage
  );
  expect(attributesA).to.deep.eq(attributesB);
};
