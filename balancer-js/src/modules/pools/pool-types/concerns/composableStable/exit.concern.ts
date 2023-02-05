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
import {
  AssetHelpers,
  insert,
  isSameAddress,
  parsePoolInfo,
  reorderArrays,
} from '@/lib/utils';
import * as SOR from '@balancer-labs/sor';
import { addSlippage, subSlippage } from '@/lib/utils/slippageHelper';
import { _downscaleDown, _upscaleArray } from '@/lib/utils/solidityMaths';
import { balancerVault } from '@/lib/constants/config';
import { Vault__factory } from '@balancer-labs/typechain';
import { ComposableStablePoolEncoder } from '@/pool-composable-stable';
import { Pool } from '@/types';
import { isUndefined } from 'lodash';

interface SortedValues {
  parsedTokens: string[];
  parsedAmp: string;
  parsedTotalShares: string;
  parsedSwapFee: string;
  bptIndex: number;
  upScaledBalancesWithoutBpt: string[];
  scalingFactors: bigint[];
  singleTokenMaxOutIndex: number | undefined;
}

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
    this.checkInputsExactBptIn(
      bptIn,
      singleTokenMaxOut,
      pool,
      shouldUnwrapNativeAsset
    );

    let sortedValues: SortedValues;
    switch (pool.poolTypeVersion) {
      case 1:
        sortedValues = this.sortV1(
          pool,
          singleTokenMaxOut,
          wrappedNativeAsset,
          shouldUnwrapNativeAsset
        );
        break;
      default:
        sortedValues = this.sortV1(
          pool,
          singleTokenMaxOut,
          wrappedNativeAsset,
          shouldUnwrapNativeAsset
        );
        break;
    }

    const { parsedTokens } = sortedValues;
    // Parse pool info into EVM amounts in order to match amountsIn scalling
    const expectedAmountsOut = Array(parsedTokens.length).fill('0');
    const minAmountsOut = Array(parsedTokens.length).fill('0');
    let userData: string;

    if (
      singleTokenMaxOut &&
      !isUndefined(sortedValues.singleTokenMaxOutIndex)
    ) {
      this.doMathsV1ExactBPTInSingleTokenOut(
        sortedValues,
        expectedAmountsOut,
        minAmountsOut,
        bptIn,
        slippage
      );

      userData = ComposableStablePoolEncoder.exitExactBPTInForOneTokenOut(
        bptIn,
        sortedValues.singleTokenMaxOutIndex as number
      );
    } else {
      throw new Error(
        'Proportional Exit - To Be Implemented, use singleTokenMaxOut variable'
      );
    }
    const to = balancerVault;
    const functionName = 'exitPool';

    const assetHelpers = new AssetHelpers(wrappedNativeAsset);

    //SORTING TOKENS AND AMOUNTS BEFORE USING ON ExitPool attributes
    const [sortedTokens, sortedAmounts] = assetHelpers.sortTokens(
      parsedTokens,
      minAmountsOut
    ) as [string[], string[]];

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

    // Encode transaction data into an ABI byte string which can be sent to the network to be executed
    const vaultInterface = Vault__factory.createInterface();
    const data = vaultInterface.encodeFunctionData(functionName, [
      attributes.poolId,
      attributes.sender,
      attributes.recipient,
      attributes.exitPoolRequest,
    ]);

    //REMOVING BPT;
    minAmountsOut.splice(sortedValues.bptIndex, 1);

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
    this.checkInputsExactTokensOut(tokensOut, amountsOut, pool);
    // Parse pool info into EVM amounts in order to match amountsOut scalling
    const {
      parsedTokensWithoutBpt,
      parsedAmp,
      parsedTotalShares,
      parsedSwapFee,
      bptIndex,
      upScaledBalancesWithoutBpt,
      scalingFactorsWithoutBpt,
      //NOT PASSING wrappedNativeAsset BECAUSE AMOUNTS WILL NEED TO BE REORDERED FOLLOWING ORIGINAL POOL TOKENS ORDER
    } = parsePoolInfo(pool);

    const assetHelpers = new AssetHelpers(wrappedNativeAsset);

    const [
      sortedTokensWithoutBpt,
      sortedUpScaledBalances,
      sortedScalingFactorsWithoutBpt,
    ] = assetHelpers.sortTokens(
      parsedTokensWithoutBpt,
      upScaledBalancesWithoutBpt,
      scalingFactorsWithoutBpt
    ) as [string[], string[], string[]];

    const [, sortedAmountsOut] = assetHelpers.sortTokens(
      tokensOut,
      amountsOut
    ) as [string[], string[]];
    // Maths should use upscaled amounts with rates, e.g. 1USDC => 1e18 not 1e6
    const upScaledAmountsOut = _upscaleArray(
      sortedAmountsOut.map((a) => BigInt(a)),
      sortedScalingFactorsWithoutBpt.map((a) => BigInt(a))
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

    //SORTING AMOUNTS FOLLOWING THE POOL TOKENS ORDER, COMPOSABLE STABLE POOLS V2 TOKENS ARE NOT SORTED BY ADDRESS, BPT IS ALWAYS THE FIRST
    const [amountsOutSortedForEncoder] = reorderArrays(
      parsedTokensWithoutBpt,
      sortedTokensWithoutBpt,
      sortedAmountsOut
    ) as [string[]];
    const userData = ComposableStablePoolEncoder.exitBPTInForExactTokensOut(
      amountsOutSortedForEncoder,
      maxBPTIn
    );

    sortedAmountsOut.splice(bptIndex, 0, '0');

    const minAmountsOut = sortedAmountsOut.map((a) =>
      BigNumber.from(a).sub(1).isNegative()
        ? a
        : BigNumber.from(a).sub(1).toString()
    );

    const sortedTokensWithBpt = insert(
      sortedTokensWithoutBpt,
      bptIndex,
      pool.address
    );

    const to = balancerVault;
    const functionName = 'exitPool';
    const attributes: ExitPool = {
      poolId: pool.id,
      sender: exiter,
      recipient: exiter,
      exitPoolRequest: {
        assets: sortedTokensWithBpt,
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
      expectedBPTIn: bptIn,
      maxBPTIn,
    };
  };

  checkInputsExactBptIn = (
    bptIn: string,
    singleTokenMaxOut: string | undefined,
    pool: Pool,
    shouldUnwrapNativeAsset: boolean
  ) => {
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

    // Check if there's any relevant composable stable pool info missing
    if (pool.tokens.some((token) => !token.decimals))
      throw new BalancerError(BalancerErrorCode.MISSING_DECIMALS);
    if (!pool.amp) throw new BalancerError(BalancerErrorCode.MISSING_AMP);
  };

  checkInputsExactTokensOut = (
    tokensOut: string[],
    amountsOut: string[],
    pool: Pool
  ) => {
    if (
      tokensOut.length != amountsOut.length ||
      tokensOut.length != pool.tokensList.length - 1
    ) {
      throw new BalancerError(BalancerErrorCode.INPUT_LENGTH_MISMATCH);
    }
    if (
      pool.poolTypeVersion === 1 &&
      amountsOut.filter((amount) => amount === '0').length !==
        pool.tokensList.length - 2
    ) {
      throw new BalancerError(BalancerErrorCode.UNSUPPORTED_POOL_TYPE_VERSION);
    }
    // Check if there's any relevant stable pool info missing
    if (pool.tokens.some((token) => !token.decimals))
      throw new BalancerError(BalancerErrorCode.MISSING_DECIMALS);
  };

  sortV1 = (
    pool: Pool,
    singleTokenMaxOut: string | undefined,
    wrappedNativeAsset: string,
    shouldUnwrapNativeAsset: boolean
  ): SortedValues => {
    const {
      parsedTokens,
      parsedAmp,
      parsedTotalShares,
      parsedSwapFee,
      bptIndex,
      upScaledBalancesWithoutBpt,
      scalingFactors,
      //NOT PASSING wrappedNativeAsset BECAUSE singleTokenMaxOutIndex MUST BE FROM THE ORIGINAL pool.tokens ARRAY
    } = parsePoolInfo(pool, wrappedNativeAsset, shouldUnwrapNativeAsset);
    let singleTokenMaxOutIndex;
    if (singleTokenMaxOut) {
      singleTokenMaxOutIndex = parsedTokens.indexOf(singleTokenMaxOut);
    }
    if (!parsedAmp) throw new BalancerError(BalancerErrorCode.MISSING_AMP);
    return {
      parsedTokens,
      parsedAmp,
      parsedTotalShares,
      parsedSwapFee,
      bptIndex,
      upScaledBalancesWithoutBpt,
      scalingFactors,
      singleTokenMaxOutIndex,
    };
  };

  doMathsV1ExactBPTInSingleTokenOut = (
    sortedValues: SortedValues,
    expectedAmountsOut: string[],
    minAmountsOut: string[],
    bptIn: string,
    slippage: string
  ) => {
    const {
      parsedAmp,
      upScaledBalancesWithoutBpt,
      singleTokenMaxOutIndex,
      scalingFactors,
      parsedTotalShares,
      parsedSwapFee,
    } = sortedValues;
    if (isUndefined(singleTokenMaxOutIndex)) {
      throw new Error('Invalid token');
    }
    // Calculate amount out given BPT in
    const amountOut = SOR.StableMathBigInt._calcTokenOutGivenExactBptIn(
      BigInt(parsedAmp as string),
      upScaledBalancesWithoutBpt.map(BigInt),
      singleTokenMaxOutIndex,
      BigInt(bptIn),
      BigInt(parsedTotalShares),
      BigInt(parsedSwapFee)
    );

    // Downscales to token decimals and removes priceRate
    const amountOutDownscaled = _downscaleDown(
      amountOut,
      BigInt(scalingFactors[singleTokenMaxOutIndex])
    );

    expectedAmountsOut[singleTokenMaxOutIndex] = amountOutDownscaled.toString();

    // Applying slippage tolerance
    minAmountsOut[singleTokenMaxOutIndex] = subSlippage(
      BigNumber.from(amountOutDownscaled.toString()),
      BigNumber.from(slippage)
    ).toString();
  };
}
