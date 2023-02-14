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
import {
  _downscaleDown,
  _downscaleDownArray,
  _upscaleArray,
} from '@/lib/utils/solidityMaths';
import { Pool } from '@/types';

interface SortedValues {
  parsedTokens: string[];
  parsedAmp?: string;
  parsedTotalShares: string;
  parsedSwapFee: string;
  upScaledBalances: string[];
}

type ExactBPTInSortedValues = SortedValues & {
  scalingFactors: bigint[];
  singleTokenMaxOutIndex: number;
};

type ExactTokensOutSortedValues = SortedValues & {
  upScaledAmountsOut: bigint[];
  downScaledAmountsOut: string[];
  downScaledAmountsOutWithRounding: string[];
};
type CalcBptInGivenExactTokensOutParams = ExactTokensOutSortedValues &
  Pick<ExitExactTokensOutParameters, 'slippage'>;

type SortValuesParams = {
  pool: Pool;
  wrappedNativeAsset: string;
  shouldUnwrapNativeAsset?: boolean;
};

type SortValuesExactBptInParams = SortValuesParams & {
  singleTokenMaxOut?: string;
};

type SortValuesExactTokensOutParams = SortValuesParams & {
  amountsOut: string[];
  tokensOut: string[];
};

type EncodeExitParams = Pick<ExitExactBPTInParameters, 'exiter'> & {
  poolTokens: string[];
  poolId: string;
  userData: string;
  minAmountsOut: string[];
};

export class StablePoolExit implements ExitConcern {
  /**
   * Builds an exit transaction for a stable pool given the exact BPT In
   * @param exiter Address of the exiter of the pool
   * @param pool Pool to be exited
   * @param bptIn quantity of bpt inserted
   * @param slippage Maximum slippage tolerance in bps i.e. 10000 = 100%, 1 = 0.01%
   * @param shouldUnwrapNativeAsset Set true if the weth should be unwrapped to Eth
   * @param wrappedNativeAsset Address of wrapped native asset for specific network config
   * @param singleTokenMaxOut The address of the token that will be singled withdrawn in the exit transaction,
   *                          if not passed, the transaction will do a proportional exit where available
   */
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
    this.checkInputsExactTokensOut(amountsOut, tokensOut, pool);

    const sortedValues = this.sortValuesExitExactTokensOut({
      pool,
      wrappedNativeAsset,
      amountsOut,
      tokensOut,
    });
    const { expectedBPTIn, maxBPTIn } = this.calcBptInGivenExactTokensOut({
      ...sortedValues,
      slippage,
    });

    const {
      downScaledAmountsOut: minAmountsOut,
      downScaledAmountsOutWithRounding: minAmountsOutWithRounding,
      parsedTokens: poolTokens,
    } = sortedValues;
    const userData = StablePoolEncoder.exitBPTInForExactTokensOut(
      minAmountsOut,
      maxBPTIn
    );
    const encodedData = this.encodeExitPool({
      poolId: pool.id,
      userData,
      poolTokens,
      minAmountsOut: minAmountsOutWithRounding,
      exiter,
    });

    return {
      ...encodedData,
      expectedBPTIn,
      maxBPTIn,
    };
  };
  /**
   *  Checks if the input of buildExitExactBPTIn is valid
   * @param bptIn Bpt inserted in the transaction
   * @param singleTokenMaxOut (optional) the address of the single token that will be withdrawn, if null|undefined, all tokens will be withdrawn proportionally.
   * @param pool the pool that is being exited
   * @param shouldUnwrapNativeAsset Set true if the weth should be unwrapped to Eth
   */
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
  /**
   * Checks if the input of buildExitExactTokensOut is valid
   * @param amountsOut Must have an amount for each token, if the user will not withdraw any amount for a token, the value shall be '0'
   * @param tokensOut Must contain all the tokens of the pool
   * @param pool The pool that is being exited
   */
  checkInputsExactTokensOut = (
    amountsOut: string[],
    tokensOut: string[],
    pool: Pool
  ): void => {
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
  };
  sortValuesExitExactBptIn = ({
    pool,
    wrappedNativeAsset,
    shouldUnwrapNativeAsset,
    singleTokenMaxOut,
  }: SortValuesExactBptInParams): ExactBPTInSortedValues => {
    const parsedPoolInfo = parsePoolInfo(
      pool,
      wrappedNativeAsset,
      shouldUnwrapNativeAsset
    );
    // Parse pool info into EVM amounts in order to match amountsIn scalling
    const { parsedTokens } = parsedPoolInfo;
    let singleTokenMaxOutIndex = -1;
    if (singleTokenMaxOut) {
      singleTokenMaxOutIndex = parsedTokens.indexOf(singleTokenMaxOut);
    }
    return {
      ...parsedPoolInfo,
      singleTokenMaxOutIndex,
    };
  };
  sortValuesExitExactTokensOut = ({
    pool,
    wrappedNativeAsset,
    amountsOut,
    tokensOut,
  }: SortValuesExactTokensOutParams): ExactTokensOutSortedValues => {
    // Parse pool info into EVM amounts in order to match amountsOut scaling
    const parsedPoolInfo = parsePoolInfo(pool);
    const { scalingFactors } = parsedPoolInfo;

    const assetHelpers = new AssetHelpers(wrappedNativeAsset);
    // Sorts amounts in into ascending order (referenced to token addresses) to match the format expected by the Vault.
    const [, downScaledAmountsOut] = assetHelpers.sortTokens(
      tokensOut,
      amountsOut
    ) as [string[], string[]];

    // Maths should use upscaled amounts, e.g. 1USDC => 1e18 not 1e6
    const upScaledAmountsOut = _upscaleArray(
      downScaledAmountsOut.map((a) => BigInt(a)),
      scalingFactors.map((a) => BigInt(a))
    );

    // This should not be required but there is currently a rounding issue with maths and this will ensure tx
    const downScaledAmountsOutWithRounding = downScaledAmountsOut.map((a) => {
      const value = BigNumber.from(a);
      return value.isZero() ? a : value.sub(1).toString();
    });

    return {
      ...parsedPoolInfo,
      upScaledAmountsOut,
      downScaledAmountsOut,
      downScaledAmountsOutWithRounding,
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
    scalingFactors,
  }: Pick<
    ExactBPTInSortedValues,
    | 'parsedTokens'
    | 'parsedAmp'
    | 'upScaledBalances'
    | 'parsedTotalShares'
    | 'parsedSwapFee'
    | 'singleTokenMaxOutIndex'
    | 'scalingFactors'
  > &
    Pick<ExitExactBPTInParameters, 'bptIn' | 'slippage'>): {
    minAmountsOut: string[];
    expectedAmountsOut: string[];
  } => {
    // Calculate amount out given BPT in
    const amountOut = SOR.StableMathBigInt._calcTokenOutGivenExactBptIn(
      BigInt(parsedAmp as string),
      upScaledBalances.map((b) => BigInt(b)),
      singleTokenMaxOutIndex,
      BigInt(bptIn),
      BigInt(parsedTotalShares),
      BigInt(parsedSwapFee)
    ).toString();

    const downscaledAmountOut = _downscaleDown(
      BigInt(amountOut) - BigInt(1), // The -1 is to solve rounding errors, sometimes the amount comes 1 point lower than expected
      scalingFactors[singleTokenMaxOutIndex]
    ).toString();

    const expectedAmountsOut = Array(parsedTokens.length).fill('0');
    const minAmountsOut = Array(parsedTokens.length).fill('0');

    expectedAmountsOut[singleTokenMaxOutIndex] = downscaledAmountOut;
    // Apply slippage tolerance
    minAmountsOut[singleTokenMaxOutIndex] = subSlippage(
      BigNumber.from(downscaledAmountOut),
      BigNumber.from(slippage)
    ).toString();

    return { minAmountsOut, expectedAmountsOut };
  };

  calcTokensOutGivenExactBptIn = ({
    upScaledBalances,
    parsedTotalShares,
    scalingFactors,
    bptIn,
    slippage,
  }: Pick<
    ExactBPTInSortedValues,
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
      scalingFactors
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
  calcBptInGivenExactTokensOut = ({
    parsedAmp,
    upScaledBalances,
    upScaledAmountsOut,
    parsedTotalShares,
    parsedSwapFee,
    slippage,
  }: CalcBptInGivenExactTokensOutParams): {
    maxBPTIn: string;
    expectedBPTIn: string;
  } => {
    // Calculate expected BPT in given tokens out
    const bptIn = SOR.StableMathBigInt._calcBptInGivenExactTokensOut(
      BigInt(parsedAmp as string),
      upScaledBalances.map((b) => BigInt(b)),
      upScaledAmountsOut,
      BigInt(parsedTotalShares),
      BigInt(parsedSwapFee)
    ).toString();

    // Apply slippage tolerance
    const maxBPTIn = addSlippage(
      BigNumber.from(bptIn),
      BigNumber.from(slippage)
    ).toString();
    return { maxBPTIn, expectedBPTIn: bptIn };
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
