import * as SOR from '@balancer-labs/sor';

import {
  JoinConcern,
  JoinPool,
  JoinPoolAttributes,
  JoinPoolParameters,
} from '../types';
import { subSlippage } from '@/lib/utils/slippageHelper';
import { AssetHelpers, parsePoolInfo } from '@/lib/utils';
import { balancerVault } from '@/lib/constants/config';
import { Vault__factory } from '@balancer-labs/typechain';
import { BigNumber, parseFixed } from '@ethersproject/bignumber';
import { AddressZero } from '@ethersproject/constants';
import { BalancerError, BalancerErrorCode } from '@/balancerErrors';
import { StablePoolEncoder } from '@/pool-stable';

export class MetaStablePoolJoin implements JoinConcern {
  /**
   * Build join pool transaction parameters with exact tokens in and minimum BPT out based on slippage tolerance
   * @param {JoinPoolParameters}  params - parameters used to build exact tokens in for bpt out transaction
   * @param {string}              params.joiner - Account address joining pool
   * @param {Pool}                params.pool - Subgraph pool object of pool being joined
   * @param {string[]}            params.tokensIn - Token addresses provided for joining pool (same length and order as amountsIn)
   * @param {string[]}            params.amountsIn -  - Token amounts provided for joining pool in EVM amounts
   * @param {string}              params.slippage - Maximum slippage tolerance in bps i.e. 50 = 0.5%
   * @returns                     transaction request ready to send with signer.sendTransaction
   */
  buildJoin = ({
    joiner,
    pool,
    tokensIn,
    amountsIn,
    slippage,
    wrappedNativeAsset,
  }: JoinPoolParameters): JoinPoolAttributes => {
    if (
      tokensIn.length != amountsIn.length ||
      tokensIn.length != pool.tokensList.length
    ) {
      throw new BalancerError(BalancerErrorCode.INPUT_LENGTH_MISMATCH);
    }

    // Check if there's any relevant meta stable pool info missing
    if (pool.tokens.some((token) => !token.decimals))
      throw new BalancerError(BalancerErrorCode.MISSING_DECIMALS);
    if (!pool.amp) throw new BalancerError(BalancerErrorCode.MISSING_AMP);
    if (pool.tokens.some((token) => !token.priceRate))
      throw new BalancerError(BalancerErrorCode.MISSING_PRICE_RATE);

    // Parse pool info into EVM amounts in order to match amountsIn scalling
    const {
      parsedTokens,
      parsedBalances,
      parsedPriceRates,
      parsedAmp,
      parsedTotalShares,
      parsedSwapFee,
    } = parsePoolInfo(pool);

    const assetHelpers = new AssetHelpers(wrappedNativeAsset);
    // sort input
    const [sortedTokens, sortedAmounts] = assetHelpers.sortTokens(
      tokensIn,
      amountsIn
    ) as [string[], string[]];
    // sort pool info
    const [, sortedBalances, sortedPriceRates] = assetHelpers.sortTokens(
      parsedTokens,
      parsedBalances,
      parsedPriceRates
    ) as [string[], string[], string[]];

    // scale amounts in based on price rate for each token
    const scaledAmounts = sortedAmounts.map((amount, i) => {
      return BigNumber.from(amount)
        .mul(BigNumber.from(sortedPriceRates[i]))
        .div(parseFixed('1', 18))
        .toString();
    });

    // scale balances based on price rate for each token
    const scaledBalances = sortedBalances.map((balance, i) => {
      return BigNumber.from(balance)
        .mul(BigNumber.from(sortedPriceRates[i]))
        .div(parseFixed('1', 18))
        .toString();
    });

    // TODO: check if it's ok to remove amounts/balances scaled logic since it's cancelling itself out
    const expectedBPTOut = SOR.StableMathBigInt._calcBptOutGivenExactTokensIn(
      BigInt(parsedAmp as string),
      scaledBalances.map((b) => BigInt(b)),
      scaledAmounts.map((a) => BigInt(a)),
      BigInt(parsedTotalShares),
      BigInt(parsedSwapFee)
    ).toString();

    const minBPTOut = subSlippage(
      BigNumber.from(expectedBPTOut),
      BigNumber.from(slippage)
    ).toString();

    const userData = StablePoolEncoder.joinExactTokensInForBPTOut(
      sortedAmounts,
      minBPTOut
    );

    const to = balancerVault;
    const functionName = 'joinPool';
    const attributes: JoinPool = {
      poolId: pool.id,
      sender: joiner,
      recipient: joiner,
      joinPoolRequest: {
        assets: sortedTokens,
        maxAmountsIn: sortedAmounts,
        userData,
        fromInternalBalance: false,
      },
    };
    const vaultInterface = Vault__factory.createInterface();
    // encode transaction data into an ABI byte string which can be sent to the network to be executed
    const data = vaultInterface.encodeFunctionData(functionName, [
      attributes.poolId,
      attributes.sender,
      attributes.recipient,
      attributes.joinPoolRequest,
    ]);
    const values = amountsIn.filter((amount, i) => tokensIn[i] === AddressZero); // filter native asset (e.g. ETH) amounts
    const value = values[0] ? BigNumber.from(values[0]) : undefined;

    return { to, functionName, attributes, data, value, minBPTOut };
  };
}
