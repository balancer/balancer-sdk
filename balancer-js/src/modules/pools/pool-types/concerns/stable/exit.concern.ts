import { BigNumber, parseFixed } from '@ethersproject/bignumber';
import { AddressZero } from '@ethersproject/constants';
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
import { StablePoolEncoder } from '@/pool-stable';

export class StablePoolExit implements ExitConcern {
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

    // Check if there's any relevant stable pool info missing
    if (pool.tokens.some((token) => !token.decimals))
      throw new BalancerError(BalancerErrorCode.MISSING_DECIMALS);
    if (!pool.amp) throw new BalancerError(BalancerErrorCode.MISSING_AMP);

    // Parse pool info into EVM amounts in order to match amountsIn scalling
    const {
      parsedTokens,
      parsedBalances,
      parsedAmp,
      parsedTotalShares,
      parsedSwapFee,
    } = parsePoolInfo(pool);

    // Replace WETH address with ETH - required for exiting with ETH
    const unwrappedTokens = parsedTokens.map((token) =>
      token === wrappedNativeAsset ? AddressZero : token
    );

    // Sort pool info based on tokens addresses
    const assetHelpers = new AssetHelpers(wrappedNativeAsset);
    const [sortedTokens, sortedBalances] = assetHelpers.sortTokens(
      shouldUnwrapNativeAsset ? unwrappedTokens : parsedTokens,
      parsedBalances
    ) as [string[], string[]];

    let minAmountsOut = Array(parsedTokens.length).fill('0');
    let userData: string;

    if (singleTokenMaxOut) {
      // Exit pool with single token using exact bptIn

      const singleTokenMaxOutIndex = parsedTokens.indexOf(singleTokenMaxOut);

      // Calculate amount out given BPT in
      const amountOut = SOR.StableMathBigInt._calcTokenOutGivenExactBptIn(
        BigInt(parsedAmp as string),
        sortedBalances.map((b) => BigInt(b)),
        singleTokenMaxOutIndex,
        BigInt(bptIn),
        BigInt(parsedTotalShares),
        BigInt(parsedSwapFee)
      ).toString();

      // Apply slippage tolerance
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
      const amountsOut = SOR.StableMathBigInt._calcTokensOutGivenExactBptIn(
        sortedBalances.map((b) => BigInt(b)),
        BigInt(bptIn),
        BigInt(parsedTotalShares)
      ).map((amount) => amount.toString());

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

    // Encode transaction data into an ABI byte string which can be sent to the network to be executed
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

    // Check if there's any relevant stable pool info missing
    if (pool.tokens.some((token) => !token.decimals))
      throw new BalancerError(BalancerErrorCode.MISSING_DECIMALS);
    if (!pool.amp) throw new BalancerError(BalancerErrorCode.MISSING_AMP);

    // Parse pool info into EVM amounts in order to match amountsOut scalling
    const {
      parsedTokens,
      parsedBalances,
      parsedAmp,
      parsedTotalShares,
      parsedSwapFee,
    } = parsePoolInfo(pool);

    // Sort pool info based on tokens addresses
    const assetHelpers = new AssetHelpers(wrappedNativeAsset);
    const [, sortedBalances] = assetHelpers.sortTokens(
      parsedTokens,
      parsedBalances
    ) as [string[], string[]];
    const [sortedTokens, sortedAmounts] = assetHelpers.sortTokens(
      tokensOut,
      amountsOut
    ) as [string[], string[]];

    // Calculate expected BPT in given tokens out
    const bptIn = SOR.StableMathBigInt._calcBptInGivenExactTokensOut(
      BigInt(parsedAmp as string),
      sortedBalances.map((b) => BigInt(b)),
      sortedAmounts.map((a) => BigInt(a)),
      BigInt(parsedTotalShares),
      BigInt(parsedSwapFee)
    ).toString();

    // Apply slippage tolerance
    const maxBPTIn = addSlippage(
      BigNumber.from(bptIn),
      BigNumber.from(slippage)
    ).toString();

    const userData = StablePoolEncoder.exitBPTInForExactTokensOut(
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
