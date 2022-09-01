import { BigNumber, parseFixed } from '@ethersproject/bignumber';
import * as SOR from '@balancer-labs/sor';
import {
  ExitConcern,
  ExitExactBPTInParameters,
  ExitExactTokensOutParameters,
  ExitPool,
  ExitPoolAttributes,
} from '../types';
import { AssetHelpers, parsePoolInfo } from '@/lib/utils';
import { Vault__factory } from '@balancer-labs/typechain';
import { addSlippage, subSlippage } from '@/lib/utils/slippageHelper';
import { balancerVault } from '@/lib/constants/config';
import { BalancerError, BalancerErrorCode } from '@/balancerErrors';
import { AddressZero } from '@ethersproject/constants';
import { StablePoolEncoder } from '@/pool-stable';

export class MetaStablePoolExit implements ExitConcern {
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
      parsedAmp,
      parsedPriceRates,
      parsedTotalShares,
      parsedSwapFee,
    } = parsePoolInfo(pool);

    // Replace WETH address with ETH - required for exiting with ETH
    const unwrappedTokens = parsedTokens.map((token) =>
      token === wrappedNativeAsset ? AddressZero : token
    );

    // Sort pool info based on tokens addresses
    const assetHelpers = new AssetHelpers(wrappedNativeAsset);
    const [sortedTokens, sortedBalances, sortedPriceRates] =
      assetHelpers.sortTokens(
        shouldUnwrapNativeAsset ? unwrappedTokens : parsedTokens,
        parsedBalances,
        parsedPriceRates
      ) as [string[], string[], string[]];

    // Scale balances based on price rate for each token
    const scaledBalances = sortedBalances.map((balance, i) => {
      return BigNumber.from(balance)
        .mul(BigNumber.from(sortedPriceRates[i]))
        .div(parseFixed('1', 18))
        .toString();
    });

    let minAmountsOut = Array(parsedTokens.length).fill('0');
    let userData: string;

    if (singleTokenMaxOut) {
      // Exit pool with single token using exact bptIn

      const singleTokenMaxOutIndex = sortedTokens.indexOf(singleTokenMaxOut);

      // Calculate amount out given BPT in
      const scaledAmountOut = SOR.StableMathBigInt._calcTokenOutGivenExactBptIn(
        BigInt(parsedAmp as string),
        scaledBalances.map((b) => BigInt(b)),
        singleTokenMaxOutIndex,
        BigInt(bptIn),
        BigInt(parsedTotalShares),
        BigInt(parsedSwapFee)
      ).toString();

      // Reverse scaled amount out based on token price rate
      const amountOut = BigNumber.from(scaledAmountOut)
        .div(BigNumber.from(sortedPriceRates[singleTokenMaxOutIndex]))
        .mul(parseFixed('1', 18))
        .toString();

      minAmountsOut[singleTokenMaxOutIndex] = subSlippage(
        BigNumber.from(amountOut),
        BigNumber.from(slippage)
      ).toString();

      userData = StablePoolEncoder.exitExactBPTInForOneTokenOut(
        bptIn,
        singleTokenMaxOutIndex
      );
    } else {
      // Exit pool with all tokens proportinally

      // Calculate amount out given BPT in
      const scaledAmountsOut =
        SOR.StableMathBigInt._calcTokensOutGivenExactBptIn(
          scaledBalances.map((b) => BigInt(b)),
          BigInt(bptIn),
          BigInt(parsedTotalShares)
        ).map((amount) => amount.toString());

      // Reverse scaled amounts out based on token price rate
      const amountsOut = scaledAmountsOut.map((amount, i) => {
        return BigNumber.from(amount)
          .div(BigNumber.from(sortedPriceRates[i]))
          .mul(parseFixed('1', 18))
          .toString();
      });

      // Apply slippage tolerance
      minAmountsOut = amountsOut.map((amount) => {
        const minAmount = subSlippage(
          BigNumber.from(amount),
          BigNumber.from(slippage)
        );
        return minAmount.toString();
      });

      userData = StablePoolEncoder.exitExactBPTInForTokensOut(bptIn);
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

    // Check if there's any relevant meta stable pool info missing
    if (pool.tokens.some((token) => !token.decimals))
      throw new BalancerError(BalancerErrorCode.MISSING_DECIMALS);
    if (!pool.amp) throw new BalancerError(BalancerErrorCode.MISSING_AMP);
    if (pool.tokens.some((token) => !token.priceRate))
      throw new BalancerError(BalancerErrorCode.MISSING_PRICE_RATE);

    // Parse pool info into EVM amounts in order to match amountsOut scalling
    const {
      parsedTokens,
      parsedBalances,
      parsedPriceRates,
      parsedAmp,
      parsedTotalShares,
      parsedSwapFee,
    } = parsePoolInfo(pool);

    // Sort pool info based on tokens addresses
    const assetHelpers = new AssetHelpers(wrappedNativeAsset);
    const [, sortedBalances, sortedPriceRates] = assetHelpers.sortTokens(
      parsedTokens,
      parsedBalances,
      parsedPriceRates
    ) as [string[], string[], string[]];
    const [sortedTokens, sortedAmounts] = assetHelpers.sortTokens(
      tokensOut,
      amountsOut
    ) as [string[], string[]];

    // Scale amounts out based on price rate for each token
    const scaledAmounts = sortedAmounts.map((amount, i) => {
      return BigNumber.from(amount)
        .mul(BigNumber.from(sortedPriceRates[i]))
        .div(parseFixed('1', 18))
        .toString();
    });

    // Scale balances based on price rate for each token
    const scaledBalances = sortedBalances.map((balance, i) => {
      return BigNumber.from(balance)
        .mul(BigNumber.from(sortedPriceRates[i]))
        .div(parseFixed('1', 18))
        .toString();
    });

    // Calculate expected BPT in given tokens out
    const bptIn = SOR.StableMathBigInt._calcBptInGivenExactTokensOut(
      BigInt(parsedAmp as string),
      scaledBalances.map((b) => BigInt(b)),
      scaledAmounts.map((a) => BigInt(a)),
      BigInt(parsedTotalShares),
      BigInt(parsedSwapFee)
    ).toString();

    // Apply slippage tolerance
    const maxBPTIn = addSlippage(
      BigNumber.from(bptIn),
      BigNumber.from(slippage)
    ).toString();

    const userData = StablePoolEncoder.exitBPTInForExactTokensOut(
      sortedAmounts, // must not use scaledAmounts because it should match amountsOut provided by the user
      maxBPTIn
    );

    // This is a hack to get around rounding issues for scaled amounts on MetaStable pools
    // TODO: do this more elegantly
    const minAmountsOut = sortedAmounts.map((a, i) =>
      a === scaledAmounts[i] ? a : BigNumber.from(a).sub(1).toString()
    );

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
      maxBPTIn,
    };
  };
}
