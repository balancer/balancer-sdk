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
  upScaledAmountsOut: bigint[];
  scalingFactors: bigint[];
  singleTokenMaxOutIndex: number | undefined;
  scalingFactorsWithoutBpt: bigint[];
  minAmountsOutWithoutBpt: string[];
  minAmountsOut: string[];
}

type DoMathsBPTInForExactTokensOutParams = SortedValues &
  Pick<ExitExactTokensOutParameters, 'slippage'>;

type GetValuesSortedParams = {
  pool: Pool;
  singleTokenMaxOut?: string;
  wrappedNativeAsset: string;
  shouldUnwrapNativeAsset?: boolean;
  amountsOut?: string[];
  tokensOut?: string[];
};

type DoExitParams = SortedValues &
  Pick<ExitExactBPTInParameters, 'exiter'> & {
    poolId: string;
    userData: string;
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

    const sortedValues = this.getValuesSorted({
      pool,
      wrappedNativeAsset,
      shouldUnwrapNativeAsset,
      singleTokenMaxOut,
    });

    const { parsedTokens } = sortedValues;
    // Parse pool info into EVM amounts in order to match amountsIn scalling
    const expectedAmountsOut: string[] = Array(parsedTokens.length).fill('0');
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
    return this.doExitExactBPTIn({
      ...sortedValues,
      poolId: pool.id,
      exiter,
      userData,
      minAmountsOut,
      expectedAmountsOut,
    });
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
    const sortedValues = this.getValuesSorted({
      pool,
      wrappedNativeAsset,
      amountsOut,
      tokensOut,
    });
    if (!sortedValues.upScaledAmountsOut) {
      throw Error('amountsOut or tokensOut parameter invalid;');
    }
    //DOING THE MATHS TO CALCULATE THE bptIn AND maxBPTIn VALUES
    const { bptIn, maxBPTIn } = this.doMathsV1BPTInExactTokensOut({
      ...sortedValues,
      slippage,
    });

    const userData = ComposableStablePoolEncoder.exitBPTInForExactTokensOut(
      sortedValues.minAmountsOutWithoutBpt as string[],
      maxBPTIn
    );

    return this.doExitExactTokensOut({
      ...sortedValues,
      userData,
      exiter,
      poolId: pool.id,
      bptIn,
      maxBPTIn,
    });
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

    //V1 COMPOSABLE STABLE POOLS ONLY SUPPORT SINGLE TOKEN OUT JOINS
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

  /**
   * Sorts and returns the values of amounts, tokens, balances, indexes, that are necessary to do the maths and build the exit transactions;
   * @param pool
   * @param singleTokenMaxOut
   * @param wrappedNativeAsset
   * @param shouldUnwrapNativeAsset
   * @param amountsOut
   * @param tokensOut
   */
  getValuesSorted = ({
    pool,
    singleTokenMaxOut,
    wrappedNativeAsset,
    shouldUnwrapNativeAsset,
    amountsOut,
    tokensOut,
  }: GetValuesSortedParams): SortedValues => {
    const parsedValues = parsePoolInfo(
      pool,
      wrappedNativeAsset,
      shouldUnwrapNativeAsset
    );
    let singleTokenMaxOutIndex;
    const { parsedTokens, parsedAmp, scalingFactorsWithoutBpt } = parsedValues;
    if (singleTokenMaxOut) {
      singleTokenMaxOutIndex = parsedTokens.indexOf(singleTokenMaxOut);
    }
    if (!parsedAmp) throw new BalancerError(BalancerErrorCode.MISSING_AMP);

    let upScaledAmountsOut: bigint[] = []; // ONLY FOR EXACT TOKENS OUT, EXACT BPT IN NEED TO CALCULATE
    let minAmountsOut: string[] = []; // ONLY FOR EXACT TOKENS OUT, EXACT BPT IN NEED TO CALCULATE
    let minAmountsOutWithoutBpt: string[] = []; // ONLY FOR EXACT TOKENS OUT, EXACT BPT IN NEED TO CALCULATE
    if (
      // ONLY EXITS OF "exact tokens out" KIND CAN USE THIS, BECAUSE THE AMOUNTS OUT ON "exact bpt in" KIND MUST BE CALCULATED
      tokensOut &&
      amountsOut &&
      amountsOut.length > 0 &&
      tokensOut.length === amountsOut.length
    ) {
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
    }

    return {
      ...parsedValues,
      singleTokenMaxOutIndex,
      upScaledAmountsOut,
      minAmountsOut, // ONLY FOR EXACT TOKENS OUT, EXACT BPT IN NEED TO CALCULATE
      minAmountsOutWithoutBpt, // ONLY FOR EXACT TOKENS OUT, EXACT BPT IN NEED TO CALCULATE
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
  doMathsV1ExactBPTInSingleTokenOut = (
    sortedValues: SortedValues,
    expectedAmountsOut: string[],
    minAmountsOut: string[],
    bptIn: string,
    slippage: string
  ): void => {
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
  /**
   * Calculate the bptIn and maxBPTIn of the exit with exact tokens out transaction and returns them;
   * @param parsedAmp
   * @param upScaledBalancesWithoutBpt
   * @param upScaledAmountsOut
   * @param parsedTotalShares
   * @param parsedSwapFee
   * @param slippage
   */
  doMathsV1BPTInExactTokensOut = ({
    parsedAmp,
    upScaledBalancesWithoutBpt,
    upScaledAmountsOut,
    parsedTotalShares,
    parsedSwapFee,
    slippage,
  }: DoMathsBPTInForExactTokensOutParams): {
    bptIn: string;
    maxBPTIn: string;
  } => {
    if (!upScaledAmountsOut) {
      throw new Error('upScaledAmountsOut is undefined');
    }
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
   * Encodes the function data and does the final building of the exit(with exact bpt in) transaction
   * @param params{DoExitParams}
   */
  doExitExactBPTIn = (params: DoExitParams): ExitExactBPTInAttributes => {
    const {
      poolId,
      exiter,
      parsedTokens,
      minAmountsOut,
      userData,
      bptIndex,
      expectedAmountsOut,
    } = params;
    const to = balancerVault;
    const functionName = 'exitPool';

    const attributes: ExitPool = {
      poolId,
      sender: exiter,
      recipient: exiter,
      exitPoolRequest: {
        assets: parsedTokens,
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

    //REMOVING BPT;
    minAmountsOut.splice(bptIndex, 1);

    return {
      to,
      functionName,
      attributes,
      data,
      expectedAmountsOut: expectedAmountsOut as string[],
      minAmountsOut,
    };
  };
  /**
   * Encodes the function data and does the final building of the exit(with exact tokens out) transaction
   * @param params
   */
  doExitExactTokensOut = (
    params: DoExitParams
  ): ExitExactTokensOutAttributes => {
    const {
      exiter,
      poolId,
      minAmountsOut,
      userData,
      bptIn,
      maxBPTIn,
      parsedTokens,
    } = params;
    if (!bptIn || !maxBPTIn) {
      throw new Error('Could not calculate bptIn');
    }

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
      expectedBPTIn: bptIn,
      maxBPTIn,
    };
  };
}
