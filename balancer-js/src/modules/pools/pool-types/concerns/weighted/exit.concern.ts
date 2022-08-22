import { BigNumber, parseFixed } from '@ethersproject/bignumber';
import OldBigNumber from 'bignumber.js';
import * as SDK from '@georgeroman/balancer-v2-pools';
import {
  ExitConcern,
  ExitExactBPTInParameters,
  ExitExactTokensOutParameters,
  ExitPool,
  ExitPoolAttributes,
} from '../types';
import { AssetHelpers, parsePoolInfo } from '@/lib/utils';
import { Vault__factory } from '@balancer-labs/typechain';
import { WeightedPoolEncoder } from '@/pool-weighted';
import { addSlippage, subSlippage } from '@/lib/utils/slippageHelper';
import { balancerVault } from '@/lib/constants/config';
import { BalancerError, BalancerErrorCode } from '@/balancerErrors';
import { AddressZero } from '@ethersproject/constants';

export class WeightedPoolExit implements ExitConcern {
  /**
   * Build exit pool transaction parameters with exact BPT in and minimum token amounts out based on slippage tolerance
   * @param {string}  exiter - Account address exiting pool
   * @param {Pool}    pool - Subgraph pool object of pool being exited
   * @param {string}  bptIn - BPT provided for exiting pool
   * @param {string}  slippage - Maximum slippage tolerance in percentage. i.e. 0.05 = 5%
   * @param {boolean} shouldUnwrapNativeAsset - Indicates wether wrapped native asset should be unwrapped after exit.
   * @param {string}  wrappedNativeAsset - Address of wrapped native asset for specific network config. Required for exiting to native asset.
   * @param {string}  singleTokenMaxOut - Optional: token address that if provided will exit to given token
   * @returns         transaction request ready to send with signer.sendTransaction
   */
  buildExitExactBPTIn = ({
    exiter,
    pool,
    bptIn,
    slippage,
    shouldUnwrapNativeAsset,
    wrappedNativeAsset,
    singleTokenMaxOut,
  }: ExitExactBPTInParameters): ExitPoolAttributes => {
    if (!bptIn.length || parseFixed(bptIn, 18).isNegative()) {
      throw new BalancerError(BalancerErrorCode.INPUT_OUT_OF_BOUNDS);
    }
    if (
      singleTokenMaxOut &&
      singleTokenMaxOut !== AddressZero &&
      !pool.tokens.map((t) => t.address).some((a) => a === singleTokenMaxOut)
    ) {
      throw new BalancerError(BalancerErrorCode.TOKEN_MISMATCH);
    }
    if (!shouldUnwrapNativeAsset && singleTokenMaxOut === AddressZero)
      throw new Error(
        'shouldUnwrapNativeAsset and singleTokenMaxOut should not have conflicting values'
      );

    // Parse pool info into EVM amounts in order to match amountsIn scalling
    const {
      parsedTokens,
      parsedBalances,
      parsedWeights,
      parsedTotalShares,
      parsedSwapFee,
    } = parsePoolInfo(pool);

    // Replace WETH address with ETH - required for exiting with ETH
    const unwrappedTokens = parsedTokens.map((token) =>
      token === wrappedNativeAsset ? AddressZero : token
    );

    // Sort pool info based on tokens addresses
    const assetHelpers = new AssetHelpers(wrappedNativeAsset);
    const [sortedTokens, sortedBalances, sortedWeights] =
      assetHelpers.sortTokens(
        shouldUnwrapNativeAsset ? unwrappedTokens : parsedTokens,
        parsedBalances,
        parsedWeights
      ) as [string[], string[], string[]];

    let minAmountsOut = Array(sortedTokens.length).fill('0');
    let userData: string;

    if (singleTokenMaxOut) {
      // Exit pool with single token using exact bptIn

      const singleTokenMaxOutIndex = sortedTokens.indexOf(singleTokenMaxOut);

      // Calculate amount out given BPT in
      const amountOut = SDK.WeightedMath._calcTokenOutGivenExactBptIn(
        new OldBigNumber(sortedBalances[singleTokenMaxOutIndex]),
        new OldBigNumber(sortedWeights[singleTokenMaxOutIndex]),
        new OldBigNumber(bptIn),
        new OldBigNumber(parsedTotalShares),
        new OldBigNumber(parsedSwapFee)
      ).toString();

      // Apply slippage
      minAmountsOut[singleTokenMaxOutIndex] = subSlippage(
        BigNumber.from(amountOut),
        BigNumber.from(slippage)
      ).toString();

      userData = WeightedPoolEncoder.exitExactBPTInForOneTokenOut(
        bptIn,
        singleTokenMaxOutIndex
      );
    } else {
      // Exit pool with all tokens proportinally

      // Calculate amounts out given BPT in
      const amountsOut = SDK.WeightedMath._calcTokensOutGivenExactBptIn(
        sortedBalances.map((b) => new OldBigNumber(b)),
        new OldBigNumber(bptIn),
        new OldBigNumber(parsedTotalShares)
      ).map((amount) => amount.toString());

      // Apply slippage
      minAmountsOut = amountsOut.map((amount) => {
        const minAmount = subSlippage(
          BigNumber.from(amount),
          BigNumber.from(slippage)
        );
        return minAmount.toString();
      });

      userData = WeightedPoolEncoder.exitExactBPTInForTokensOut(bptIn);
    }

    const to = balancerVault;
    const functionName = 'exitPool';
    const attributes: ExitPool = {
      poolId: pool.id,
      sender: exiter,
      recipient: exiter,
      exitPoolRequest: {
        assets: sortedTokens,
        minAmountsOut,
        userData,
        toInternalBalance: false,
      },
    };

    // encode transaction data into an ABI byte string which can be sent to the network to be executed
    const vaultInterface = Vault__factory.createInterface();
    const data = vaultInterface.encodeFunctionData(functionName, [
      attributes.poolId,
      attributes.sender,
      attributes.recipient,
      attributes.exitPoolRequest,
    ]);

    return {
      to,
      functionName,
      attributes,
      data,
      minAmountsOut,
      maxBPTIn: bptIn,
    };
  };

  /**
   * Build exit pool transaction parameters with exact tokens out and maximum BPT in based on slippage tolerance
   * @param {string}    exiter - Account address exiting pool
   * @param {Pool}      pool - Subgraph pool object of pool being exited
   * @param {string[]}  tokensOut - Tokens provided for exiting pool
   * @param {string[]}  amountsOut - Amoutns provided for exiting pool
   * @param {string}    slippage - Maximum slippage tolerance in percentage. i.e. 0.05 = 5%
   * @param {string}    wrappedNativeAsset - Address of wrapped native asset for specific network config. Required for exiting with ETH.
   * @returns           transaction request ready to send with signer.sendTransaction
   */
  buildExitExactTokensOut = ({
    exiter,
    pool,
    tokensOut,
    amountsOut,
    slippage,
    wrappedNativeAsset,
  }: ExitExactTokensOutParameters): ExitPoolAttributes => {
    if (
      tokensOut.length != amountsOut.length ||
      tokensOut.length != pool.tokensList.length
    ) {
      throw new BalancerError(BalancerErrorCode.INPUT_LENGTH_MISMATCH);
    }

    // Parse pool info into EVM amounts in order to match amountsIn scalling
    const {
      parsedTokens,
      parsedBalances,
      parsedWeights,
      parsedTotalShares,
      parsedSwapFee,
    } = parsePoolInfo(pool);

    // Sort pool info and inputs based on tokens addresses
    const assetHelpers = new AssetHelpers(wrappedNativeAsset);
    const [, sortedBalances, sortedWeights] = assetHelpers.sortTokens(
      parsedTokens,
      parsedBalances,
      parsedWeights
    ) as [string[], string[], string[]];
    const [sortedTokens, sortedAmounts] = assetHelpers.sortTokens(
      tokensOut,
      amountsOut
    ) as [string[], string[]];

    // Calculate expected BPT in given tokens out
    const bptIn = SDK.WeightedMath._calcBptInGivenExactTokensOut(
      sortedBalances.map((b) => new OldBigNumber(b)),
      sortedWeights.map((w) => new OldBigNumber(w)),
      sortedAmounts.map((a) => new OldBigNumber(a)),
      new OldBigNumber(parsedTotalShares),
      new OldBigNumber(parsedSwapFee)
    ).toString();

    // Apply slippage
    const maxBPTIn = addSlippage(
      BigNumber.from(bptIn),
      BigNumber.from(slippage)
    ).toString();

    const userData = WeightedPoolEncoder.exitBPTInForExactTokensOut(
      sortedAmounts,
      maxBPTIn
    );

    const to = balancerVault;
    const functionName = 'exitPool';
    const attributes: ExitPool = {
      poolId: pool.id,
      sender: exiter,
      recipient: exiter,
      exitPoolRequest: {
        assets: sortedTokens,
        minAmountsOut: sortedAmounts,
        userData,
        toInternalBalance: false,
      },
    };

    // encode transaction data into an ABI byte string which can be sent to the network to be executed
    const vaultInterface = Vault__factory.createInterface();
    const data = vaultInterface.encodeFunctionData(functionName, [
      attributes.poolId,
      attributes.sender,
      attributes.recipient,
      attributes.exitPoolRequest,
    ]);

    return {
      to,
      functionName,
      attributes,
      data,
      minAmountsOut: sortedAmounts,
      maxBPTIn,
    };
  };
}
