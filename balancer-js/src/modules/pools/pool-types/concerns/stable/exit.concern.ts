import { BigNumber, parseFixed } from '@ethersproject/bignumber';
import { AddressZero } from '@ethersproject/constants';
import * as SOR from '@balancer-labs/sor';
import {
  ExitConcern,
  ExitExactBPTInAttributes,
  ExitExactTokensOutAttributes,
  ExitExactBPTInParameters,
  ExitExactTokensOutParameters,
  ExitPool,
  ExitPoolAttributes,
} from '../types';
import { AssetHelpers, isSameAddress, parsePoolInfo } from '@/lib/utils';
import { Vault__factory } from '@balancer-labs/typechain';
import { addSlippage, subSlippage } from '@/lib/utils/slippageHelper';
import { balancerVault } from '@/lib/constants/config';
import { BalancerError, BalancerErrorCode } from '@/balancerErrors';
import { StablePoolEncoder } from '@/pool-stable';
import { _downscaleDownArray, _upscaleArray } from '@/lib/utils/solidityMaths';

type ExactBPTInSortedValues = {
  parsedTokens: string[];
  parsedAmp: string;
  parsedTotalShares: string;
  parsedSwapFee: string;
  upScaledBalances: string[];
  scalingFactors: bigint[];
  singleTokenMaxOutIndex: number;
};

type EncodeExitParams = Pick<ExitExactBPTInParameters, 'exiter'> & {
  poolTokens: string[];
  poolId: string;
  userData: string;
  minAmountsOut: string[];
};

export class StablePoolExit implements ExitConcern {
  buildExitExactBPTIn = ({
    exiter,
    pool,
    bptIn,
    slippage,
    shouldUnwrapNativeAsset,
    wrappedNativeAsset,
    singleTokenMaxOut,
  }: ExitExactBPTInParameters): ExitExactBPTInAttributes => {
    this.checkInputsExactBPTIn({
      bptIn,
      singleTokenMaxOut,
      pool,
      shouldUnwrapNativeAsset,
    });
    const sortedValues = this.sortValuesExitExactBptIn({
      pool,
      wrappedNativeAsset,
      shouldUnwrapNativeAsset,
      singleTokenMaxOut,
    });
    const { minAmountsOut, expectedAmountsOut } =
      sortedValues.singleTokenMaxOutIndex >= 0
        ? this.calcTokenOutGivenExactBptIn({
            ...sortedValues,
            bptIn,
            slippage,
          })
        : this.calcTokensOutGivenExactBptIn({
            ...sortedValues,
            bptIn,
            slippage,
          });
    const userData =
      sortedValues.singleTokenMaxOutIndex >= 0
        ? StablePoolEncoder.exitExactBPTInForOneTokenOut(
            bptIn,
            sortedValues.singleTokenMaxOutIndex
          )
        : StablePoolEncoder.exitExactBPTInForTokensOut(bptIn);
    const encodedData = this.encodeExitPool({
      poolTokens: sortedValues.parsedTokens,
      poolId: pool.id,
      exiter,
      minAmountsOut,
      userData,
    });

    return {
      ...encodedData,
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
      parsedAmp,
      parsedTotalShares,
      parsedSwapFee,
      upScaledBalances,
      scalingFactors,
    } = parsePoolInfo(pool);

    // Sort pool info based on tokens addresses
    const assetHelpers = new AssetHelpers(wrappedNativeAsset);
    const [, sortedUpScaledBalances, sortedScalingFactors] =
      assetHelpers.sortTokens(
        parsedTokens,
        upScaledBalances,
        scalingFactors
      ) as [string[], string[], string[]];
    const [sortedTokens, sortedAmountsOut] = assetHelpers.sortTokens(
      tokensOut,
      amountsOut
    ) as [string[], string[]];

    // Maths should use upscaled amounts, e.g. 1USDC => 1e18 not 1e6
    const upScaledAmountsOut = _upscaleArray(
      sortedAmountsOut.map((a) => BigInt(a)),
      sortedScalingFactors.map((a) => BigInt(a))
    );

    // Calculate expected BPT in given tokens out
    const bptIn = SOR.StableMathBigInt._calcBptInGivenExactTokensOut(
      BigInt(parsedAmp as string),
      sortedUpScaledBalances.map((b) => BigInt(b)),
      upScaledAmountsOut,
      BigInt(parsedTotalShares),
      BigInt(parsedSwapFee)
    ).toString();

    // Apply slippage tolerance
    const maxBPTIn = addSlippage(
      BigNumber.from(bptIn),
      BigNumber.from(slippage)
    ).toString();

    const userData = StablePoolEncoder.exitBPTInForExactTokensOut(
      sortedAmountsOut,
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
        minAmountsOut: sortedAmountsOut,
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
      expectedBPTIn: bptIn,
      maxBPTIn,
    };
  };
  checkInputsExactBPTIn = ({
    bptIn,
    singleTokenMaxOut,
    pool,
    shouldUnwrapNativeAsset,
  }: Pick<
    ExitExactBPTInParameters,
    'bptIn' | 'singleTokenMaxOut' | 'pool' | 'shouldUnwrapNativeAsset'
  >): void => {
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

    // Check if there's any relevant stable pool info missing
    if (pool.tokens.some((token) => !token.decimals))
      throw new BalancerError(BalancerErrorCode.MISSING_DECIMALS);
    if (!pool.amp) throw new BalancerError(BalancerErrorCode.MISSING_AMP);
  };

  sortValuesExitExactBptIn = ({
    pool,
    wrappedNativeAsset,
    shouldUnwrapNativeAsset,
    singleTokenMaxOut,
  }: Pick<
    ExitExactBPTInParameters,
    | 'pool'
    | 'wrappedNativeAsset'
    | 'shouldUnwrapNativeAsset'
    | 'singleTokenMaxOut'
  >): ExactBPTInSortedValues => {
    // Parse pool info into EVM amounts in order to match amountsIn scalling
    const {
      parsedTokens,
      parsedAmp,
      parsedTotalShares,
      parsedSwapFee,
      upScaledBalances,
      scalingFactors,
    } = parsePoolInfo(pool, wrappedNativeAsset, shouldUnwrapNativeAsset);
    let singleTokenMaxOutIndex = -1;
    if (singleTokenMaxOut) {
      singleTokenMaxOutIndex = parsedTokens.indexOf(singleTokenMaxOut);
    }
    return {
      parsedTokens,
      parsedAmp,
      parsedTotalShares,
      parsedSwapFee,
      upScaledBalances,
      scalingFactors,
      singleTokenMaxOutIndex,
    };
  };

  calcTokenOutGivenExactBptIn = ({
    parsedTokens,
    parsedAmp,
    upScaledBalances,
    parsedTotalShares,
    parsedSwapFee,
    singleTokenMaxOutIndex,
    bptIn,
    slippage,
  }: Pick<
    ExactBPTInSortedValues,
    | 'parsedTokens'
    | 'parsedAmp'
    | 'upScaledBalances'
    | 'parsedTotalShares'
    | 'parsedSwapFee'
    | 'singleTokenMaxOutIndex'
  > &
    Pick<ExitExactBPTInParameters, 'bptIn' | 'slippage'>): {
    minAmountsOut: string[];
    expectedAmountsOut: string[];
  } => {
    const expectedAmountsOut = Array(parsedTokens.length).fill('0');
    const minAmountsOut = Array(parsedTokens.length).fill('0');
    // Calculate amount out given BPT in
    const amountOut = SOR.StableMathBigInt._calcTokenOutGivenExactBptIn(
      BigInt(parsedAmp as string),
      upScaledBalances.map((b) => BigInt(b)),
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
    return { minAmountsOut, expectedAmountsOut };
  };

  calcTokensOutGivenExactBptIn = ({
    parsedTokens,
    upScaledBalances,
    parsedTotalShares,
    scalingFactors,
    bptIn,
    slippage,
  }: Pick<
    ExactBPTInSortedValues,
    | 'parsedTokens'
    | 'upScaledBalances'
    | 'parsedTotalShares'
    | 'scalingFactors'
    | 'singleTokenMaxOutIndex'
  > &
    Pick<ExitExactBPTInParameters, 'bptIn' | 'slippage'>): {
    minAmountsOut: string[];
    expectedAmountsOut: string[];
  } => {
    const amountsOut = SOR.StableMathBigInt._calcTokensOutGivenExactBptIn(
      upScaledBalances.map((b) => BigInt(b)),
      BigInt(bptIn),
      BigInt(parsedTotalShares)
    ).map((amount) => amount.toString());

    // Maths return numbers scaled to 18 decimals. Must scale down to token decimals.
    const amountsOutScaledDown = _downscaleDownArray(
      amountsOut.map((a) => BigInt(a)),
      scalingFactors.map((a) => BigInt(a))
    );

    const expectedAmountsOut = amountsOutScaledDown.map((amount) =>
      amount.toString()
    );

    // Apply slippage tolerance
    const minAmountsOut = amountsOutScaledDown.map((amount) => {
      const minAmount = subSlippage(
        BigNumber.from(amount),
        BigNumber.from(slippage)
      );
      return minAmount.toString();
    });
    return { minAmountsOut, expectedAmountsOut };
  };

  encodeExitPool = ({
    poolId,
    exiter,
    poolTokens,
    minAmountsOut,
    userData,
  }: EncodeExitParams): ExitPoolAttributes => {
    const to = balancerVault;
    const functionName = 'exitPool';
    const attributes: ExitPool = {
      poolId,
      sender: exiter,
      recipient: exiter,
      exitPoolRequest: {
        assets: poolTokens,
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
    return { data, to, functionName, attributes };
  };
}
