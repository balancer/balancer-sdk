import {
  ExitConcern,
  ExitExactBPTInAttributes,
  ExitExactBPTInParameters,
  ExitExactTokensOutAttributes,
  ExitExactTokensOutParameters,
  ExitPool,
} from '../types';
import { BigNumber, parseFixed } from '@ethersproject/bignumber';
import { BalancerError, BalancerErrorCode } from '@/balancerErrors';
import { AddressZero } from '@ethersproject/constants';
import { AssetHelpers, isSameAddress, parsePoolInfo } from '@/lib/utils';
import * as SOR from '@balancer-labs/sor';
import { subSlippage } from '@/lib/utils/slippageHelper';
import { _downscaleDownArray } from '@/lib/utils/solidityMaths';
import { balancerVault } from '@/lib/constants/config';
import { Vault__factory } from '@balancer-labs/typechain';
import { ComposableStablePoolEncoder } from '@/pool-composable-stable';
import { StablePoolEncoder } from '@/pool-stable';

export class ComposableStablePoolExit implements ExitConcern {
  buildExitExactBPTIn = ({
    exiter,
    pool,
    bptIn,
    slippage,
    shouldUnwrapNativeAsset,
    wrappedNativeAsset,
    singleTokenMaxOut,
  }: ExitExactBPTInParameters): ExitExactBPTInAttributes => {
    if (!bptIn.length || parseFixed(bptIn, 18).isNegative()) {
      throw new BalancerError(BalancerErrorCode.INPUT_OUT_OF_BOUNDS);
    }
    if (
      singleTokenMaxOut &&
      singleTokenMaxOut !== AddressZero &&
      !pool.tokens
        .map((t) => t.address)
        .some((a) => isSameAddress(a, singleTokenMaxOut))
    ) {
      throw new BalancerError(BalancerErrorCode.TOKEN_MISMATCH);
    }

    if (!shouldUnwrapNativeAsset && singleTokenMaxOut === AddressZero)
      throw new Error(
        'shouldUnwrapNativeAsset and singleTokenMaxOut should not have conflicting values'
      );

    if (!singleTokenMaxOut && pool.poolTypeVersion === 1) {
      throw new BalancerError(BalancerErrorCode.UNSUPPORTED_POOL_TYPE_VERSION);
    }

    // Check if there's any relevant stable pool info missing
    if (pool.tokens.some((token) => !token.decimals))
      throw new BalancerError(BalancerErrorCode.MISSING_DECIMALS);
    if (!pool.amp) throw new BalancerError(BalancerErrorCode.MISSING_AMP);

    // Parse pool info into EVM amounts in order to match amountsIn scalling
    const {
      parsedTokens,
      parsedAmp,
      parsedTotalShares,
      parsedSwapFee,
      upScaledBalances,
      scalingFactors,
    } = parsePoolInfo(pool);

    // Replace WETH address with ETH - required for exiting with ETH
    const unwrappedTokens = parsedTokens.map((token) =>
      token === wrappedNativeAsset ? AddressZero : token
    );

    // Sort pool info based on tokens addresses
    const assetHelpers = new AssetHelpers(wrappedNativeAsset);
    const [sortedTokens, sortedUpscaledBalances, sortedScalingFactors] =
      assetHelpers.sortTokens(
        shouldUnwrapNativeAsset ? unwrappedTokens : parsedTokens,
        upScaledBalances,
        scalingFactors
      ) as [string[], string[], string[]];
    const sortedTokensBptIndex = sortedTokens.findIndex(
      (address) => address === pool.address
    );
    let expectedAmountsOut = Array(parsedTokens.length).fill('0');
    let minAmountsOut = Array(parsedTokens.length).fill('0');
    let userData: string;

    if (singleTokenMaxOut) {
      // Exit pool with single token using exact bptIn

      const singleTokenMaxOutIndex = parsedTokens.indexOf(singleTokenMaxOut);

      // Calculate amount out given BPT in
      const amountOut = SOR.StableMathBigInt._calcTokenOutGivenExactBptIn(
        BigInt(parsedAmp as string),
        sortedUpscaledBalances
          .filter((_, index) => index !== sortedTokensBptIndex)
          .map((b) => BigInt(b)),
        singleTokenMaxOutIndex,
        BigInt(bptIn),
        BigInt(parsedTotalShares),
        BigInt(parsedSwapFee)
      ).toString();

      expectedAmountsOut[singleTokenMaxOutIndex] = amountOut;

      // Apply slippage tolerance
      minAmountsOut[singleTokenMaxOutIndex] = subSlippage(
        BigNumber.from(amountOut),
        BigNumber.from(slippage)
      ).toString();

      userData = ComposableStablePoolEncoder.exitExactBPTInForOneTokenOut(
        bptIn,
        singleTokenMaxOutIndex
      );
    } else {
      // Exit pool with all tokens proportinally

      // Calculate amount out given BPT in
      const amountsOut = SOR.StableMathBigInt._calcTokensOutGivenExactBptIn(
        sortedUpscaledBalances
          .filter((_, index) => index !== sortedTokensBptIndex)
          .map((b) => BigInt(b)),
        BigInt(bptIn),
        BigInt(parsedTotalShares)
      ).map((amount) => amount.toString());
      // Maths return numbers scaled to 18 decimals. Must scale down to token decimals.
      const amountsOutScaledDown = _downscaleDownArray(
        amountsOut.map((a) => BigInt(a)),
        sortedScalingFactors.map((a) => BigInt(a))
      );

      expectedAmountsOut = amountsOutScaledDown.map((amount) =>
        amount.toString()
      );

      // Apply slippage tolerance
      minAmountsOut = amountsOutScaledDown.map((amount) => {
        const minAmount = subSlippage(
          BigNumber.from(amount),
          BigNumber.from(slippage)
        );
        return minAmount.toString();
      });

      userData =
        ComposableStablePoolEncoder.exitExactBPTInForAllTokensOut(bptIn);
    }
    const to = balancerVault;
    const functionName = 'exitPool';

    console.log(sortedTokens);
    console.log(minAmountsOut);
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
      expectedAmountsOut,
      minAmountsOut,
    };
  };

  buildExitExactTokensOut = ({
    exiter,
    pool,
    tokensOut,
    amountsOut,
    slippage,
    wrappedNativeAsset,
  }: ExitExactTokensOutParameters): ExitExactTokensOutAttributes => {
    // TODO implementation
    console.log(
      exiter,
      pool,
      tokensOut,
      amountsOut,
      slippage,
      wrappedNativeAsset
    );

    throw new Error('To be implemented');
  };
}
