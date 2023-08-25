import { BigNumber } from '@ethersproject/bignumber';
import { AddressZero } from '@ethersproject/constants';
import { Vault__factory } from '@/contracts/factories/Vault__factory';

import * as SOR from '@balancer-labs/sor';
import { BalancerError, BalancerErrorCode } from '@/balancerErrors';
import {
  AssetHelpers,
  insert,
  isSameAddress,
  parsePoolInfo,
} from '@/lib/utils';
import { addSlippage, subSlippage } from '@/lib/utils/slippageHelper';
import {
  _downscaleDown,
  _downscaleDownArray,
  _upscaleArray,
} from '@/lib/utils/solidityMaths';
import { balancerVault } from '@/lib/constants/config';
import { ComposableStablePoolEncoder } from '@/pool-composable-stable';
import { Pool } from '@/types';
import {
  ExitConcern,
  ExitExactBPTInAttributes,
  ExitExactBPTInParameters,
  ExitExactTokensOutAttributes,
  ExitExactTokensOutParameters,
  ExitPool,
  ExitPoolAttributes,
} from '../types';
import { BasePoolEncoder } from '@/pool-base';
import { StablePoolPriceImpact } from '../stable/priceImpact.concern';

interface SortedValues {
  poolTokens: string[];
  ampWithPrecision: bigint;
  totalSharesEvm: bigint;
  swapFeeEvm: bigint;
  bptIndex: number;
  upScaledBalancesWithoutBpt: bigint[];
  scalingFactors: bigint[];
  scalingFactorsWithoutBpt: bigint[];
}

type ExactBPTInSortedValues = SortedValues & {
  singleTokenOutIndexWithoutBpt: number;
};
type ExactTokensOutSortedValues = SortedValues & {
  upScaledAmountsOutWithoutBpt: bigint[];
  downscaledAmountsOutWithoutBpt: string[];
  downscaledAmountsOutWithBpt: string[];
};

type CalcBptInGivenExactTokensOutParams = ExactTokensOutSortedValues &
  Pick<ExitExactTokensOutParameters, 'slippage'>;

type SortValuesParams = {
  pool: Pool;
  wrappedNativeAsset: string;
  shouldUnwrapNativeAsset?: boolean;
};

type SortValuesExactBptInParams = SortValuesParams & {
  singleTokenOut?: string;
};

type SortValuesExactTokensOutParams = SortValuesParams & {
  amountsOut: string[];
  tokensOut: string[];
};

type EncodeExitParams = Pick<
  ExitExactBPTInParameters,
  'exiter' | 'toInternalBalance'
> & {
  poolTokens: string[];
  poolId: string;
  userData: string;
  minAmountsOut: string[];
};

export class ComposableStablePoolExit implements ExitConcern {
  buildExitExactBPTIn = ({
    exiter,
    pool,
    bptIn,
    slippage,
    shouldUnwrapNativeAsset,
    wrappedNativeAsset,
    singleTokenOut,
    toInternalBalance,
  }: ExitExactBPTInParameters): ExitExactBPTInAttributes => {
    this.checkInputsExactBPTIn({
      bptIn,
      singleTokenOut,
      pool,
      shouldUnwrapNativeAsset,
    });

    const sortedValues = this.sortValuesExitExactBptIn({
      pool,
      wrappedNativeAsset,
      shouldUnwrapNativeAsset,
      singleTokenOut,
    });

    const { minAmountsOut, expectedAmountsOut } =
      sortedValues.singleTokenOutIndexWithoutBpt >= 0
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
      sortedValues.singleTokenOutIndexWithoutBpt >= 0
        ? ComposableStablePoolEncoder.exitExactBPTInForOneTokenOut(
            bptIn,
            sortedValues.singleTokenOutIndexWithoutBpt
          )
        : ComposableStablePoolEncoder.exitExactBPTInForAllTokensOut(bptIn);

    // MinAmounts needs a value for BPT for encoding
    const minAmountsOutWithBpt = insert(
      minAmountsOut,
      sortedValues.bptIndex,
      '0'
    );
    const encodedData = this.encodeExitPool({
      poolTokens: sortedValues.poolTokens,
      poolId: pool.id,
      exiter,
      userData,
      minAmountsOut: minAmountsOutWithBpt,
      toInternalBalance,
    });

    const priceImpactConcern = new StablePoolPriceImpact();
    const priceImpact = priceImpactConcern.calcPriceImpact(
      pool,
      expectedAmountsOut.map(BigInt),
      BigInt(bptIn),
      false
    );

    return {
      ...encodedData,
      expectedAmountsOut,
      minAmountsOut,
      priceImpact,
    };
  };

  buildExitExactTokensOut = ({
    exiter,
    pool,
    tokensOut,
    amountsOut,
    slippage,
    wrappedNativeAsset,
    toInternalBalance,
  }: ExitExactTokensOutParameters): ExitExactTokensOutAttributes => {
    this.checkInputsExactTokensOut(tokensOut, amountsOut, pool);
    const sortedValues = this.sortValuesExitExactTokensOut({
      pool,
      wrappedNativeAsset,
      amountsOut,
      tokensOut,
    });

    const { bptIn, maxBPTIn } = this.calcBptInGivenExactTokensOut({
      ...sortedValues,
      slippage,
    });

    // Have to make sure amountsOut does not have value for BPT index
    const userData = ComposableStablePoolEncoder.exitBPTInForExactTokensOut(
      sortedValues.downscaledAmountsOutWithoutBpt,
      maxBPTIn
    );

    const encodedData = this.encodeExitPool({
      poolTokens: sortedValues.poolTokens,
      minAmountsOut: sortedValues.downscaledAmountsOutWithBpt,
      userData,
      exiter,
      poolId: pool.id,
      toInternalBalance,
    });

    const priceImpactConcern = new StablePoolPriceImpact();
    const priceImpact = priceImpactConcern.calcPriceImpact(
      pool,
      sortedValues.downscaledAmountsOutWithoutBpt.map(BigInt),
      BigInt(bptIn),
      false
    );

    return {
      ...encodedData,
      maxBPTIn,
      expectedBPTIn: bptIn,
      priceImpact,
    };
  };

  buildRecoveryExit = ({
    exiter,
    pool,
    bptIn,
    slippage,
    toInternalBalance,
  }: Pick<
    ExitExactBPTInParameters,
    'exiter' | 'pool' | 'bptIn' | 'slippage' | 'toInternalBalance'
  >): ExitExactBPTInAttributes => {
    this.checkInputsRecoveryExit({
      bptIn,
      pool,
    });
    // Recovery exits don't use rates. We use them as part of scalingFactor so default to 1 incase of issues
    pool.tokens.forEach((t) => (t.priceRate = '1'));

    const sortedValues = parsePoolInfo(pool);

    const { minAmountsOut, expectedAmountsOut } =
      this.calcTokensOutGivenExactBptIn({
        ...sortedValues,
        bptIn,
        slippage,
      });

    const userData = BasePoolEncoder.recoveryModeExit(bptIn);

    // MinAmounts needs a value for BPT for encoding
    const minAmountsOutWithBpt = insert(
      minAmountsOut,
      sortedValues.bptIndex,
      '0'
    );
    const encodedData = this.encodeExitPool({
      poolTokens: sortedValues.poolTokens,
      poolId: pool.id,
      exiter,
      userData,
      minAmountsOut: minAmountsOutWithBpt,
      toInternalBalance,
    });

    const priceImpactConcern = new StablePoolPriceImpact();
    const priceImpact = priceImpactConcern.calcPriceImpact(
      pool,
      expectedAmountsOut.map(BigInt),
      BigInt(bptIn),
      false
    );

    return {
      ...encodedData,
      expectedAmountsOut,
      minAmountsOut,
      priceImpact,
    };
  };

  /**
   *  Checks if the input of buildExitExactBPTIn is valid
   * @param bptIn Bpt amoun in EVM scale
   * @param singleTokenOut (optional) the address of the single token that will be withdrawn, if null|undefined, all tokens will be withdrawn proportionally.
   * @param pool the pool that is being exited
   * @param shouldUnwrapNativeAsset Set true if the weth should be unwrapped to Eth
   */
  checkInputsExactBPTIn = ({
    bptIn,
    singleTokenOut,
    pool,
    shouldUnwrapNativeAsset,
  }: Pick<
    ExitExactBPTInParameters,
    'bptIn' | 'singleTokenOut' | 'pool' | 'shouldUnwrapNativeAsset'
  >): void => {
    if (BigNumber.from(bptIn).lte(0)) {
      throw new BalancerError(BalancerErrorCode.INPUT_OUT_OF_BOUNDS);
    }
    if (!singleTokenOut && pool.poolTypeVersion < 2) {
      throw new Error('Unsupported Exit Type For Pool');
    }
    if (
      singleTokenOut &&
      singleTokenOut !== AddressZero &&
      !pool.tokens
        .map((t) => t.address)
        .some((a) => isSameAddress(a, singleTokenOut))
    ) {
      throw new BalancerError(BalancerErrorCode.TOKEN_MISMATCH);
    }

    if (!shouldUnwrapNativeAsset && singleTokenOut === AddressZero)
      throw new Error(
        'shouldUnwrapNativeAsset and singleTokenOut should not have conflicting values'
      );

    // Check if there's any relevant stable pool info missing
    if (pool.tokens.some((token) => token.decimals === undefined))
      throw new BalancerError(BalancerErrorCode.MISSING_DECIMALS);
    if (!pool.amp) throw new BalancerError(BalancerErrorCode.MISSING_AMP);
  };

  /**
   * Checks if the input of buildExitExactTokensOut is valid
   */
  checkInputsExactTokensOut = (
    tokensOut: string[],
    amountsOut: string[],
    pool: Pool
  ): void => {
    // Should have a token for input for each non-BPT pool token
    // Should be an amount out for each token out
    if (
      tokensOut.length != amountsOut.length ||
      tokensOut.length != pool.tokensList.length - 1
    ) {
      throw new BalancerError(BalancerErrorCode.INPUT_LENGTH_MISMATCH);
    }
  };

  /**
   *  Checks if the input of buildExitExactBPTIn is valid
   * @param bptIn Bpt amount in EVM scale
   * @param pool the pool that is being exited
   */
  checkInputsRecoveryExit = ({
    bptIn,
    pool,
  }: Pick<ExitExactBPTInParameters, 'bptIn' | 'pool'>): void => {
    if (BigNumber.from(bptIn).lte(0)) {
      throw new BalancerError(BalancerErrorCode.INPUT_OUT_OF_BOUNDS);
    }
    if (!pool.isInRecoveryMode) {
      throw new Error(
        'Exit type not supported because pool is not in Recovery Mode'
      );
    }

    // Check if there's any relevant stable pool info missing
    if (pool.tokens.some((token) => token.decimals === undefined))
      throw new BalancerError(BalancerErrorCode.MISSING_DECIMALS);
    if (!pool.amp) throw new BalancerError(BalancerErrorCode.MISSING_AMP);
  };

  /**
   * Sorts and returns the values of amounts, tokens, balances, indexes, that are necessary to do the maths and build the exit transactions
   * @param pool
   * @param singleTokenOut
   * @param wrappedNativeAsset
   * @param shouldUnwrapNativeAsset
   * @param amountsOut
   * @param tokensOut
   */
  sortValuesExitExactBptIn = ({
    pool,
    singleTokenOut,
    wrappedNativeAsset,
    shouldUnwrapNativeAsset,
  }: SortValuesExactBptInParams): ExactBPTInSortedValues => {
    const parsedValues = parsePoolInfo(
      pool,
      wrappedNativeAsset,
      shouldUnwrapNativeAsset
    );
    let singleTokenOutIndexWithoutBpt = -1;
    if (singleTokenOut) {
      singleTokenOutIndexWithoutBpt =
        parsedValues.poolTokensWithoutBpt.indexOf(singleTokenOut);
    }
    return {
      ...parsedValues,
      singleTokenOutIndexWithoutBpt,
    };
  };
  /**
   * Sorts and returns the values of amounts, tokens, balances, indexes, that are necessary to do the maths and build the exit transactions
   * @param pool
   * @param singleTokenOut
   * @param wrappedNativeAsset
   * @param amountsOut
   * @param tokensOut
   */
  sortValuesExitExactTokensOut = ({
    pool,
    wrappedNativeAsset,
    amountsOut,
    tokensOut,
  }: SortValuesExactTokensOutParams): ExactTokensOutSortedValues => {
    const shouldUnwrapNativeAsset = tokensOut.some((a) => a === AddressZero);
    const parsedValues = parsePoolInfo(
      pool,
      wrappedNativeAsset,
      shouldUnwrapNativeAsset
    );
    const assetHelpers = new AssetHelpers(wrappedNativeAsset);
    // Sorts amounts out into ascending order (referenced to token addresses) to match the format expected by the Vault.
    const [, downscaledAmountsOutWithoutBpt] = assetHelpers.sortTokens(
      tokensOut,
      amountsOut
    ) as [string[], string[]];

    const downscaledAmountsOutWithBpt = insert(
      downscaledAmountsOutWithoutBpt,
      parsedValues.bptIndex,
      '0'
    );

    // This should not be required but there is currently a rounding issue with maths and this will ensure tx
    const downscaledAmountsOutWithBptWithRounding =
      downscaledAmountsOutWithBpt.map((a) => {
        const value = BigNumber.from(a);
        return value.isZero() ? a : value.sub(1).toString();
      });

    // Maths should use upscaled amounts with rates, e.g. 1USDC => 1e18 not 1e6
    const upScaledAmountsOutWithoutBpt = _upscaleArray(
      downscaledAmountsOutWithoutBpt.map((a) => BigInt(a)),
      parsedValues.scalingFactorsWithoutBpt
    );

    return {
      ...parsedValues,
      upScaledAmountsOutWithoutBpt,
      downscaledAmountsOutWithBpt: downscaledAmountsOutWithBptWithRounding,
      downscaledAmountsOutWithoutBpt,
    };
  };
  /**
   * Calculate the minimum and expect amountOut of the exit with exact bpt in transaction, and passes it to minAmountsOut and expectedAmountsOut arrays passed as parameters;
   * @param sortedValues
   * @param expectedAmountsOut
   * @param minAmountsOut
   * @param bptIn
   * @param slippage
   */
  calcTokenOutGivenExactBptIn = ({
    ampWithPrecision,
    upScaledBalancesWithoutBpt,
    singleTokenOutIndexWithoutBpt,
    scalingFactorsWithoutBpt,
    totalSharesEvm,
    swapFeeEvm,
    bptIn,
    slippage,
  }: Pick<
    ExactBPTInSortedValues,
    | 'ampWithPrecision'
    | 'upScaledBalancesWithoutBpt'
    | 'singleTokenOutIndexWithoutBpt'
    | 'scalingFactorsWithoutBpt'
    | 'totalSharesEvm'
    | 'swapFeeEvm'
  > &
    Pick<ExitExactBPTInParameters, 'bptIn' | 'slippage'>): {
    minAmountsOut: string[];
    expectedAmountsOut: string[];
  } => {
    // Calculate amount out given BPT in
    const amountOut = SOR.StableMathBigInt._calcTokenOutGivenExactBptIn(
      ampWithPrecision,
      upScaledBalancesWithoutBpt,
      singleTokenOutIndexWithoutBpt,
      BigInt(bptIn),
      totalSharesEvm,
      swapFeeEvm
    );
    const expectedAmountsOut = Array(upScaledBalancesWithoutBpt.length).fill(
      '0'
    );
    const minAmountsOut = Array(upScaledBalancesWithoutBpt.length).fill('0');
    // Downscales to token decimals and removes priceRate
    const downscaledAmountOut = _downscaleDown(
      amountOut,
      scalingFactorsWithoutBpt[singleTokenOutIndexWithoutBpt]
    );

    expectedAmountsOut[singleTokenOutIndexWithoutBpt] =
      downscaledAmountOut.toString();
    // Apply slippage tolerance
    minAmountsOut[singleTokenOutIndexWithoutBpt] = subSlippage(
      BigNumber.from(downscaledAmountOut),
      BigNumber.from(slippage)
    ).toString();

    return { minAmountsOut, expectedAmountsOut };
  };

  calcTokensOutGivenExactBptIn = ({
    upScaledBalancesWithoutBpt,
    totalSharesEvm,
    scalingFactorsWithoutBpt,
    bptIn,
    slippage,
  }: Pick<
    ExactBPTInSortedValues,
    'upScaledBalancesWithoutBpt' | 'totalSharesEvm' | 'scalingFactorsWithoutBpt'
  > &
    Pick<ExitExactBPTInParameters, 'bptIn' | 'slippage'>): {
    minAmountsOut: string[];
    expectedAmountsOut: string[];
  } => {
    const amountsOut = SOR.StableMathBigInt._calcTokensOutGivenExactBptIn(
      upScaledBalancesWithoutBpt,
      BigInt(bptIn),
      totalSharesEvm
    );
    // Maths return numbers scaled to 18 decimals. Must scale down to token decimals.
    const amountsOutScaledDown = _downscaleDownArray(
      amountsOut,
      scalingFactorsWithoutBpt
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

  /**
   * Calculate the bptIn and maxBPTIn of the exit with exact tokens out transaction and returns them;
   * @param ampWithPrecision
   * @param upScaledBalancesWithoutBpt
   * @param upScaledAmountsOut
   * @param totalSharesEvm
   * @param swapFeeEvm
   * @param slippage
   */
  calcBptInGivenExactTokensOut = ({
    ampWithPrecision,
    upScaledBalancesWithoutBpt,
    upScaledAmountsOutWithoutBpt,
    totalSharesEvm,
    swapFeeEvm,
    slippage,
  }: CalcBptInGivenExactTokensOutParams): {
    bptIn: string;
    maxBPTIn: string;
  } => {
    const bptIn = SOR.StableMathBigInt._calcBptInGivenExactTokensOut(
      ampWithPrecision,
      upScaledBalancesWithoutBpt,
      upScaledAmountsOutWithoutBpt,
      totalSharesEvm,
      swapFeeEvm
    ).toString();

    // Apply slippage tolerance
    const maxBPTIn = addSlippage(
      BigNumber.from(bptIn),
      BigNumber.from(slippage)
    ).toString();

    return { bptIn, maxBPTIn };
  };

  /**
   * Encodes the function data and does the final building of the exit(with exact tokens out) transaction
   * @param params
   */
  encodeExitPool = (params: EncodeExitParams): ExitPoolAttributes => {
    const {
      exiter,
      poolId,
      minAmountsOut,
      userData,
      poolTokens,
      toInternalBalance,
    } = params;

    const to = balancerVault;
    const functionName = 'exitPool';
    const attributes: ExitPool = {
      poolId: poolId,
      sender: exiter,
      recipient: exiter,
      exitPoolRequest: {
        assets: poolTokens,
        minAmountsOut,
        userData,
        toInternalBalance,
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
    };
  };
}
