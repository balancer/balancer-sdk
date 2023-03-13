import * as SOR from '@balancer-labs/sor';
import { BigNumber } from '@ethersproject/bignumber';

import { BalancerError, BalancerErrorCode } from '@/balancerErrors';
import { Vault__factory } from '@/contracts';
import { balancerVault } from '@/lib/constants/config';
import { parsePoolInfo } from '@/lib/utils';
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

type EncodeExitParams = Pick<ExitExactBPTInParameters, 'exiter'> & {
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
  }: ExitExactBPTInParameters): ExitExactBPTInAttributes => {
    // TODO implementation
    console.log(
      exiter,
      pool,
      bptIn,
      slippage,
      shouldUnwrapNativeAsset,
      wrappedNativeAsset,
      singleTokenOut
    );
    throw new Error('To be implemented');
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

  buildRecoveryExit = ({
    exiter,
    pool,
    bptIn,
    slippage,
  }: Pick<
    ExitExactBPTInParameters,
    'exiter' | 'pool' | 'bptIn' | 'slippage'
  >): ExitExactBPTInAttributes => {
    this.checkInputsRecoveryExit({
      bptIn,
      singleTokenOut: undefined,
      pool,
      shouldUnwrapNativeAsset: false,
    });
    const sortedValues = parsePoolInfo(pool);
    const { minAmountsOut, expectedAmountsOut } =
      this.calcTokensOutGivenExactBptIn({
        ...sortedValues,
        bptIn,
        slippage,
      });

    const userData = BasePoolEncoder.recoveryModeExit(bptIn);

    const encodedData = this.encodeExitPool({
      poolTokens: sortedValues.poolTokens,
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

  /**
   *  Checks if the input of buildExitExactBPTIn is valid
   * @param bptIn Bpt amount in EVM scale
   * @param pool the pool that is being exited
   */
  checkInputsRecoveryExit = ({
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
    if (pool.tokens.some((token) => !token.decimals))
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
   * Encodes the function data and does the final building of the exit(with exact tokens out) transaction
   * @param params
   */
  encodeExitPool = (params: EncodeExitParams): ExitPoolAttributes => {
    const { exiter, poolId, minAmountsOut, userData, poolTokens } = params;

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
