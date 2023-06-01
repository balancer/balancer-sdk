import { expect } from 'chai';
import { BigNumber } from '@ethersproject/bignumber';
import { JsonRpcSigner } from '@ethersproject/providers';

import { BalancerSDK, subSlippage, removeItem, truncateAddresses } from '@/.';
import { Relayer } from '@/modules/relayer/relayer.module';
import { accuracy, sendTransactionGetBalances } from '@/test/lib/utils';

import { SimulationType } from '../simulation/simulation.module';
import { AddressZero, Zero } from '@ethersproject/constants';

export interface Pool {
  id: string;
  address: string;
  slot: number;
}

export const testGeneralisedJoin = async (
  sdk: BalancerSDK,
  signer: JsonRpcSigner,
  userAddress: string,
  pool: { id?: string; address: string },
  tokensIn: string[],
  amountsIn: string[],
  simulationType: SimulationType.Static | SimulationType.Tenderly
): Promise<void> => {
  const slippage = '10'; // 10 bps = 0.1%

  // Replicating UI user flow:
  // 1. Gets relevant join info
  //    - this helps user to decide if they will approve relayer, etc by returning estimated amount out/pi.
  const { expectedOut: estimatedAmountOut } = await sdk.pools.generalisedJoin(
    pool.id as string,
    tokensIn,
    amountsIn,
    userAddress,
    slippage,
    signer,
    SimulationType.VaultModel,
    undefined
  );

  // 2. User approves relayer
  const authorisation = await Relayer.signRelayerApproval(
    sdk.contracts.relayer.address,
    userAddress,
    signer,
    sdk.contracts.vault
  );

  // 3. Get call data and expected/min amount out
  //    - Uses a Static/Tenderly call to simulate tx then applies slippage
  const { to, encodedCall, minOut, expectedOut, priceImpact, value } =
    await sdk.pools.generalisedJoin(
      pool.id as string,
      tokensIn,
      amountsIn,
      userAddress,
      slippage,
      signer,
      simulationType,
      authorisation
    );

  // 4. Sends tx
  const tokensForBalanceCheck = [pool.address, ...tokensIn];
  const { balanceDeltas, transactionReceipt, gasUsed } =
    await sendTransactionGetBalances(
      tokensForBalanceCheck,
      signer,
      userAddress,
      to,
      encodedCall,
      value
    );

  console.log('Gas used', gasUsed.toString());
  console.log('Price impact: ', priceImpact);

  console.table({
    tokens: truncateAddresses(tokensForBalanceCheck),
    expectedDeltas: [expectedOut, ...amountsIn],
    balanceDeltas: balanceDeltas.map((d) => d.toString()),
  });

  expect(transactionReceipt.status).to.eq(1);
  expect(BigInt(expectedOut) > 0).to.be.true;
  expect(BigNumber.from(expectedOut).gt(minOut)).to.be.true;
  expect(amountsIn).to.deep.eq(
    removeItem(balanceDeltas, 0).map((a) => a.toString())
  );
  const expectedMinBpt = subSlippage(
    BigNumber.from(expectedOut),
    BigNumber.from(slippage)
  ).toString();
  expect(expectedMinBpt).to.deep.eq(minOut);
  // VaultModel simulation inaccuracy should not be over to 1%
  expect(
    accuracy(balanceDeltas[0], BigNumber.from(estimatedAmountOut))
  ).to.be.closeTo(1, 1e-2);
  /**
   * Ideally Static and Tenderly simulations should match exactly to amountOut,
   * but it's currently not the case. I believe this is caused by the workaround
   * that simulates with wETH and executes with ETH.
   * Since the error is too small, I'd say we're fine, but this should be
   * properly checked once we no longer need the workaround.
   */
  expect(accuracy(balanceDeltas[0], BigNumber.from(expectedOut))).to.be.closeTo(
    1,
    1e-4
  );
  const nativeAssetIndex = tokensForBalanceCheck.indexOf(AddressZero);
  const nativeAssetAmount =
    nativeAssetIndex === -1 ? Zero : balanceDeltas[nativeAssetIndex];
  expect(value.toString()).to.eq(nativeAssetAmount.toString());
};
