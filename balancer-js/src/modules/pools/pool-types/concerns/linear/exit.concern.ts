/* eslint-disable @typescript-eslint/no-unused-vars */
import * as SOR from '@balancer-labs/sor';
import { BigNumber } from '@ethersproject/bignumber';

import { BalancerError, BalancerErrorCode } from '@/balancerErrors';
import { Vault__factory } from '@/contracts';
import { balancerVault } from '@/lib/constants/config';
import { insert, parsePoolInfo, removeItem } from '@/lib/utils';
import { _downscaleDownArray } from '@/lib/utils/solidityMaths';
import { subSlippage } from '@/lib/utils/slippageHelper';
import { BasePoolEncoder } from '@/pool-base';

import {
  ExitConcern,
  ExitExactBPTInParameters,
  ExitExactTokensOutParameters,
  ExitExactBPTInAttributes,
  ExitExactTokensOutAttributes,
  ExitPoolAttributes,
  ExitPool,
} from '../types';
import { LinearPriceImpact } from '../linear/priceImpact.concern';

interface SortedValues {
  bptIndex: number;
  poolTokens: string[];
  totalSharesEvm: bigint;
  swapFeeEvm: bigint;
  upScaledBalances: bigint[];
}

type ExactBPTInSortedValues = SortedValues & {
  scalingFactors: bigint[];
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

export class LinearPoolExit implements ExitConcern {
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
    throw new Error('Exit type not supported');
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
    throw new Error('Exit type not supported');
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
    this.checkInputsExactBPTIn({
      bptIn,
      singleTokenOut: undefined,
      pool,
      shouldUnwrapNativeAsset: false,
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
      minAmountsOut: minAmountsOutWithBpt,
      userData,
      toInternalBalance,
    });

    const priceImpactConcern = new LinearPriceImpact();
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
   * @param bptIn Bpt amount in EVM scale
   * @param pool the pool that is being exited
   */
  checkInputsExactBPTIn = ({
    bptIn,
    pool,
  }: Pick<
    ExitExactBPTInParameters,
    'bptIn' | 'singleTokenOut' | 'pool' | 'shouldUnwrapNativeAsset'
  >): void => {
    if (BigNumber.from(bptIn).lte(0)) {
      throw new BalancerError(BalancerErrorCode.INPUT_OUT_OF_BOUNDS);
    }

    // Check if there's any relevant stable pool info missing
    if (pool.tokens.some((token) => token.decimals === undefined))
      throw new BalancerError(BalancerErrorCode.MISSING_DECIMALS);
  };

  calcTokensOutGivenExactBptIn = ({
    bptIndex,
    upScaledBalances,
    totalSharesEvm,
    scalingFactors,
    bptIn,
    slippage,
  }: Pick<
    ExactBPTInSortedValues,
    'bptIndex' | 'upScaledBalances' | 'totalSharesEvm' | 'scalingFactors'
  > &
    Pick<ExitExactBPTInParameters, 'bptIn' | 'slippage'>): {
    minAmountsOut: string[];
    expectedAmountsOut: string[];
  } => {
    const amountsOut = SOR.LinearMaths._calcTokensOutGivenExactBptIn(
      upScaledBalances,
      BigInt(bptIn),
      totalSharesEvm,
      bptIndex
    );
    // Maths return numbers scaled to 18 decimals. Must scale down to token decimals.
    const amountsOutScaledDown = _downscaleDownArray(
      amountsOut,
      scalingFactors
    );

    const expectedAmountsOut = removeItem(amountsOutScaledDown, bptIndex).map(
      (amount) => amount.toString()
    );
    // Apply slippage tolerance
    const minAmountsOut = expectedAmountsOut.map((amount) => {
      const minAmount = subSlippage(
        BigNumber.from(amount),
        BigNumber.from(slippage)
      );
      return minAmount.toString();
    });
    return { minAmountsOut, expectedAmountsOut };
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
