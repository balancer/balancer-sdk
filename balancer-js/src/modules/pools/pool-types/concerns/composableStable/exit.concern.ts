import {
  ExitConcern,
  ExitExactBPTInAttributes,
  ExitExactBPTInParameters,
  ExitExactTokensOutAttributes,
  ExitExactTokensOutParameters,
  ExitPool,
  ExitPoolAttributes,
} from '../types';
import { BigNumber, parseFixed } from '@ethersproject/bignumber';
import { BalancerError, BalancerErrorCode } from '@/balancerErrors';
import { AddressZero } from '@ethersproject/constants';
import {
  AssetHelpers,
  insert,
  isSameAddress,
  parsePoolInfo,
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
  parsedAmp?: string;
  parsedTotalShares: string;
  parsedSwapFee: string;
  bptIndex: number;
  upScaledBalancesWithoutBpt: string[];
  scalingFactors: bigint[];
  scalingFactorsWithoutBpt: bigint[];
}

type ExactBPTInSortedValues = SortedValues & {
  singleTokenMaxOutIndex?: number;
};
type ExactTokensOutSortedValues = SortedValues & {
  upScaledAmountsOut: bigint[];
  minAmountsOutWithoutBpt: string[];
  minAmountsOut: string[];
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

type DoExitParams = SortedValues &
  Pick<ExitExactBPTInParameters, 'exiter'> & {
    poolId: string;
    userData: string;
    minAmountsOut: string[];
    expectedAmountsOut?: string[];
    maxBPTIn?: string;
    bptIn?: string;
  };

export class ComposableStablePoolExit implements ExitConcern {
  /**
   * Builds an exit with exact bpt in transaction;
   * @param params
   *  @param exiter{string} is the address of the exiter of the pool
   *  @param pool{Pool} is the pool object(it's automatically inserted when you wrap a Pool with the methods using balancer.pools.wrap function)
   *  @param bptIn{string} the amount of bpt in the exit
   *  @param slippage{string} the percentage of slippage,in 1:0.01% scale ('1' equals 0.01%, '10000' equals 100%)
   *  @param shouldUnwrapNativeAsset if the wETH should be unwrapped to ETH
   *  @param wrappedNativeAsset wETH address, used to build AssetHelpers object;
   *  @param singleTokenMaxOut The address of the token that will be singled withdrawn in the exit transaction,
   *                           if not passed, the transaction will do a proportional exit, only available for v2 composable stable pools
   * @returns an object containing the attributes necessary to make an exit with exact bpt in transaction;
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
    this.checkInputsExactBptIn(
      bptIn,
      singleTokenMaxOut,
      pool,
      shouldUnwrapNativeAsset
    );

    const sortedValues = this.sortValuesExitExactBptInBasedOnPoolVersion({
      pool,
      wrappedNativeAsset,
      shouldUnwrapNativeAsset,
      singleTokenMaxOut,
    });

    const { minAmountsOut, expectedAmountsOut, minAmountsOutWithoutBpt } =
      this.calcTokenOutGivenExactBptIn(sortedValues, bptIn, slippage);

    const userData = ComposableStablePoolEncoder.exitExactBPTInForOneTokenOut(
      bptIn,
      sortedValues.singleTokenMaxOutIndex as number
    );

    const encodedData = this.encodeExitPool({
      ...sortedValues,
      poolId: pool.id,
      exiter,
      userData,
      minAmountsOut,
    });

    return {
      ...encodedData,
      expectedAmountsOut,
      minAmountsOut: minAmountsOutWithoutBpt,
    };
  };

  /**
   * Builds an exit with exact tokens out transaction;
   * @param params
   *  @param exiter{string} is the address of the exiter of the pool
   *  @param pool{Pool} is the pool object(it's automatically inserted when you wrap a Pool with the methods using balancer.pools.wrap function)
   *  @param tokensOut{string[]} the tokensList of the pool, without BPT
   *  @param amountsOut{string[]}  the amounts of each token in the tokensOut, sorted as the tokensOut
   *  @param slippage the percentage of slippage,in 1:0.01% scale ('1' equals 0.01%, '10000' equals 100%)
   *  @param wrappedNativeAsset wETH address, used to build AssetHelpers object;
   * @returns an object containing the attributes necessary to make an exit with exact bpt in transaction;
   *
   */
  buildExitExactTokensOut = ({
    exiter,
    pool,
    tokensOut,
    amountsOut,
    slippage,
    wrappedNativeAsset,
  }: ExitExactTokensOutParameters): ExitExactTokensOutAttributes => {
    this.checkInputsExactTokensOut(tokensOut, amountsOut, pool);
    const sortedValues = this.sortValuesExitExactTokensOutBasedOnPoolVersion({
      pool,
      wrappedNativeAsset,
      amountsOut,
      tokensOut,
    });
    if (!sortedValues.upScaledAmountsOut) {
      throw Error('amountsOut or tokensOut parameter invalid;');
    }
    //doing the maths to calculate the bptIn and maxBPTIn values
    const { bptIn, maxBPTIn } = this.calcBptInGivenExactTokensOut({
      ...sortedValues,
      slippage,
    });

    const userData = ComposableStablePoolEncoder.exitBPTInForExactTokensOut(
      sortedValues.minAmountsOutWithoutBpt as string[],
      maxBPTIn
    );

    const encodedData = this.encodeExitPool({
      ...sortedValues,
      userData,
      exiter,
      poolId: pool.id,
    });

    return {
      ...encodedData,
      maxBPTIn,
      expectedBPTIn: bptIn,
    };
  };

  /**
   * Checks if the input of buildExitExactBPTIn is valid;
   */
  checkInputsExactBptIn = (
    bptIn: string,
    singleTokenMaxOut: string | undefined,
    pool: Pool,
    shouldUnwrapNativeAsset: boolean
  ): void => {
    if (!singleTokenMaxOut) {
      throw new Error(
        'Proportional Exit - To Be Implemented, use singleTokenMaxOut variable'
      );
    }
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

    //V1 composable stable pools only support single token out joins
    if (!singleTokenMaxOut && pool.poolTypeVersion === 1) {
      throw new BalancerError(BalancerErrorCode.UNSUPPORTED_POOL_TYPE_VERSION);
    }

    // Check if there's any relevant composable stable pool info missing
    if (pool.tokens.some((token) => !token.decimals))
      throw new BalancerError(BalancerErrorCode.MISSING_DECIMALS);
    if (!pool.amp) throw new BalancerError(BalancerErrorCode.MISSING_AMP);
  };
  /**
   * Checks if the input of buildExitExactTokensOut is valid;
   */
  checkInputsExactTokensOut = (
    tokensOut: string[],
    amountsOut: string[],
    pool: Pool
  ): void => {
    if (
      tokensOut.length != amountsOut.length ||
      tokensOut.length != pool.tokensList.length - 1
    ) {
      throw new BalancerError(BalancerErrorCode.INPUT_LENGTH_MISMATCH);
    }
    if (
      // Only Composable Stable Pools V2+ accepts more than 1 token exits.
      // Checks if the poolTypeVersion is 1 and there's more than one token with amountsOut > 0
      pool.poolTypeVersion === 1 &&
      amountsOut.filter((amount) => BigInt(amount) > BigInt(0)).length > 1
    ) {
      throw new BalancerError(BalancerErrorCode.UNSUPPORTED_POOL_TYPE_VERSION);
    }
    // Check if there's any relevant stable pool info missing
    if (pool.tokens.some((token) => !token.decimals))
      throw new BalancerError(BalancerErrorCode.MISSING_DECIMALS);
  };

  /**
   * Sorts and returns the values of amounts, tokens, balances, indexes, that are necessary to do the maths and build the exit transactions;
   * @param pool
   * @param singleTokenMaxOut
   * @param wrappedNativeAsset
   * @param shouldUnwrapNativeAsset
   * @param amountsOut
   * @param tokensOut
   */
  sortValuesExitExactBptInBasedOnPoolVersion = ({
    pool,
    singleTokenMaxOut,
    wrappedNativeAsset,
    shouldUnwrapNativeAsset,
  }: SortValuesExactBptInParams): ExactBPTInSortedValues => {
    const parsedValues = parsePoolInfo(
      pool,
      wrappedNativeAsset,
      shouldUnwrapNativeAsset
    );
    let singleTokenMaxOutIndex;
    const { parsedTokens, parsedAmp } = parsedValues;
    if (singleTokenMaxOut) {
      singleTokenMaxOutIndex = parsedTokens.indexOf(singleTokenMaxOut);
    }
    if (!parsedAmp) throw new BalancerError(BalancerErrorCode.MISSING_AMP);

    return {
      ...parsedValues,
      singleTokenMaxOutIndex,
    };
  };
  /**
   * Sorts and returns the values of amounts, tokens, balances, indexes, that are necessary to do the maths and build the exit transactions;
   * @param pool
   * @param singleTokenMaxOut
   * @param wrappedNativeAsset
   * @param shouldUnwrapNativeAsset
   * @param amountsOut
   * @param tokensOut
   */
  sortValuesExitExactTokensOutBasedOnPoolVersion = ({
    pool,
    wrappedNativeAsset,
    shouldUnwrapNativeAsset,
    amountsOut,
    tokensOut,
  }: SortValuesExactTokensOutParams): ExactTokensOutSortedValues => {
    const parsedValues = parsePoolInfo(
      pool,
      wrappedNativeAsset,
      shouldUnwrapNativeAsset
    );
    const { parsedAmp, scalingFactorsWithoutBpt } = parsedValues;
    if (!parsedAmp) throw new BalancerError(BalancerErrorCode.MISSING_AMP);

    let upScaledAmountsOut: bigint[] = []; // only for exact tokens out, exact bpt in need to calculate
    let minAmountsOut: string[] = []; // only for exact tokens out, exact bpt in need to calculate
    let minAmountsOutWithoutBpt: string[] = []; // only for exact tokens out, exact bpt in need to calculate
    const assetHelpers = new AssetHelpers(wrappedNativeAsset);
    const [, sortedAmountsOut] = assetHelpers.sortTokens(
      tokensOut,
      amountsOut
    ) as [string[], string[]];
    // Maths should use upscaled amounts with rates, e.g. 1USDC => 1e18 not 1e6
    upScaledAmountsOut = _upscaleArray(
      sortedAmountsOut.map((a) => BigInt(a)),
      scalingFactorsWithoutBpt.map((a) => BigInt(a))
    );

    minAmountsOutWithoutBpt = sortedAmountsOut;

    minAmountsOut = insert(
      minAmountsOutWithoutBpt,
      parsedValues.bptIndex,
      '0'
    ).map((a) =>
      BigNumber.from(a).sub(3).isNegative()
        ? a.toString()
        : BigNumber.from(a).sub(3).toString()
    );

    return {
      ...parsedValues,
      upScaledAmountsOut,
      minAmountsOut,
      minAmountsOutWithoutBpt,
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
  calcTokenOutGivenExactBptIn = (
    sortedValues: ExactBPTInSortedValues,
    bptIn: string,
    slippage: string
  ): {
    minAmountsOut: string[];
    expectedAmountsOut: string[];
    minAmountsOutWithoutBpt: string[];
  } => {
    const {
      parsedTokens,
      parsedAmp,
      upScaledBalancesWithoutBpt,
      singleTokenMaxOutIndex,
      scalingFactors,
      parsedTotalShares,
      parsedSwapFee,
      bptIndex,
    } = sortedValues;

    if (isUndefined(singleTokenMaxOutIndex)) {
      throw new Error(
        'Proportional Exit - To Be Implemented, use singleTokenMaxOut variable'
      );
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
    const expectedAmountsOut: string[] = Array(parsedTokens.length).fill('0');
    const minAmountsOut = Array(parsedTokens.length).fill('0');

    expectedAmountsOut[singleTokenMaxOutIndex] = amountOutDownscaled.toString();

    // Applying slippage tolerance
    minAmountsOut[singleTokenMaxOutIndex] = subSlippage(
      BigNumber.from(amountOutDownscaled.toString()),
      BigNumber.from(slippage)
    ).toString();
    const minAmountsOutWithoutBpt = minAmountsOut.filter(
      (_, i) => i !== bptIndex
    );
    return { expectedAmountsOut, minAmountsOut, minAmountsOutWithoutBpt };
  };
  /**
   * Calculate the bptIn and maxBPTIn of the exit with exact tokens out transaction and returns them;
   * @param parsedAmp
   * @param upScaledBalancesWithoutBpt
   * @param upScaledAmountsOut
   * @param parsedTotalShares
   * @param parsedSwapFee
   * @param slippage
   */
  calcBptInGivenExactTokensOut = ({
    parsedAmp,
    upScaledBalancesWithoutBpt,
    upScaledAmountsOut,
    parsedTotalShares,
    parsedSwapFee,
    slippage,
  }: CalcBptInGivenExactTokensOutParams): {
    bptIn: string;
    maxBPTIn: string;
  } => {
    const bptIn = SOR.StableMathBigInt._calcBptInGivenExactTokensOut(
      BigInt(parsedAmp as string),
      upScaledBalancesWithoutBpt.map(BigInt),
      upScaledAmountsOut,
      BigInt(parsedTotalShares),
      BigInt(parsedSwapFee)
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
  encodeExitPool = (params: DoExitParams): ExitPoolAttributes => {
    const { exiter, poolId, minAmountsOut, userData, parsedTokens } = params;

    const to = balancerVault;
    const functionName = 'exitPool';
    const attributes: ExitPool = {
      poolId: poolId,
      sender: exiter,
      recipient: exiter,
      exitPoolRequest: {
        assets: parsedTokens,
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
    };
  };
}
