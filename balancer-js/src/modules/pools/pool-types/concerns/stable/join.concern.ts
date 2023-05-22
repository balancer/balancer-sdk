import * as SOR from '@balancer-labs/sor';
import { BigNumber } from '@ethersproject/bignumber';

import { BalancerError, BalancerErrorCode } from '@/balancerErrors';
import { Vault__factory } from '@/contracts/factories/Vault__factory';
import { balancerVault } from '@/lib/constants/config';
import { AssetHelpers, getEthValue, parsePoolInfo } from '@/lib/utils';
import { subSlippage } from '@/lib/utils/slippageHelper';
import { _upscaleArray } from '@/lib/utils/solidityMaths';
import { StablePoolEncoder } from '@/pool-stable';
import { Pool } from '@/types';

import { StablePoolPriceImpact } from '../stable/priceImpact.concern';
import {
  JoinConcern,
  JoinPool,
  JoinPoolAttributes,
  JoinPoolParameters,
} from '../types';
import { AddressZero } from '@ethersproject/constants';

type SortedValues = {
  poolTokens: string[];
  ampWithPrecision: bigint;
  totalSharesEvm: bigint;
  swapFeeEvm: bigint;
  upScaledBalances: bigint[];
  upScaledAmountsIn: bigint[];
  sortedAmountsIn: string[];
};

type EncodeJoinPoolParams = {
  joiner: string;
  poolId: string;
  minBPTOut: string;
} & Pick<SortedValues, 'poolTokens' | 'sortedAmountsIn'> &
  Pick<JoinPoolParameters, 'amountsIn' | 'tokensIn'>;

export class StablePoolJoin implements JoinConcern {
  buildJoin = ({
    joiner,
    pool,
    tokensIn,
    amountsIn,
    slippage,
    wrappedNativeAsset,
  }: JoinPoolParameters): JoinPoolAttributes => {
    this.checkInputs(tokensIn, amountsIn, pool);
    const sortedValues = this.sortValues({
      pool,
      wrappedNativeAsset,
      tokensIn,
      amountsIn,
    });

    const { expectedBPTOut, minBPTOut } = this.calcBptOutGivenExactTokensIn({
      ...sortedValues,
      slippage,
    });

    const encodedData = this.encodeJoinPool({
      joiner,
      amountsIn,
      tokensIn,
      poolId: pool.id,
      minBPTOut,
      ...sortedValues,
    });

    const priceImpactConcern = new StablePoolPriceImpact();
    const priceImpact = priceImpactConcern.calcPriceImpact(
      pool,
      sortedValues.sortedAmountsIn.map(BigInt),
      BigInt(expectedBPTOut),
      true
    );

    return {
      ...encodedData,
      minBPTOut,
      expectedBPTOut,
      priceImpact,
    };
  };

  /**
   * Check if the input parameters of the buildJoin function are right
   * @param amountsIn Must have an amount for each token, if the user will not deposit any amount for a token, the value shall be '0'
   * @param tokensIn Must contain all the tokens of the pool
   * @param pool The pool that is being joined
   */
  checkInputs = (amountsIn: string[], tokensIn: string[], pool: Pool): void => {
    if (
      tokensIn.length != amountsIn.length ||
      tokensIn.length != pool.tokensList.length
    ) {
      throw new BalancerError(BalancerErrorCode.INPUT_LENGTH_MISMATCH);
    }

    // Check if there's any relevant stable pool info missing
    if (pool.tokens.some((token) => token.decimals === undefined))
      throw new BalancerError(BalancerErrorCode.MISSING_DECIMALS);
    if (!pool.amp) throw new BalancerError(BalancerErrorCode.MISSING_AMP);
  };

  sortValues = ({
    pool,
    wrappedNativeAsset,
    amountsIn,
    tokensIn,
  }: Pick<
    JoinPoolParameters,
    'pool' | 'wrappedNativeAsset' | 'amountsIn' | 'tokensIn'
  >): SortedValues => {
    // Parse pool info into EVM amounts in order to match amountsIn scalling
    const {
      poolTokens,
      ampWithPrecision,
      totalSharesEvm,
      swapFeeEvm,
      scalingFactors,
      upScaledBalances,
    } = parsePoolInfo(pool, wrappedNativeAsset, tokensIn.includes(AddressZero));

    const assetHelpers = new AssetHelpers(wrappedNativeAsset);
    // Sorts amounts in into ascending order (referenced to token addresses) to match the format expected by the Vault.
    const [, sortedAmountsIn] = assetHelpers.sortTokens(
      tokensIn,
      amountsIn
    ) as [string[], string[]];

    // Maths should use upscaled amounts, e.g. 1USDC => 1e18 not 1e6
    const upScaledAmountsIn = _upscaleArray(
      sortedAmountsIn.map((a) => BigInt(a)),
      scalingFactors.map((a) => BigInt(a))
    );
    return {
      poolTokens,
      ampWithPrecision,
      totalSharesEvm,
      swapFeeEvm,
      upScaledBalances,
      upScaledAmountsIn,
      sortedAmountsIn,
    };
  };

  calcBptOutGivenExactTokensIn = ({
    ampWithPrecision,
    upScaledBalances,
    upScaledAmountsIn,
    totalSharesEvm,
    swapFeeEvm,
    slippage,
  }: Pick<JoinPoolParameters, 'slippage'> &
    Pick<
      SortedValues,
      | 'ampWithPrecision'
      | 'upScaledBalances'
      | 'upScaledAmountsIn'
      | 'totalSharesEvm'
      | 'swapFeeEvm'
    >): { expectedBPTOut: string; minBPTOut: string } => {
    const expectedBPTOut = SOR.StableMathBigInt._calcBptOutGivenExactTokensIn(
      ampWithPrecision,
      upScaledBalances,
      upScaledAmountsIn,
      totalSharesEvm,
      swapFeeEvm
    ).toString();

    const minBPTOut = subSlippage(
      BigNumber.from(expectedBPTOut),
      BigNumber.from(slippage)
    ).toString();

    return {
      expectedBPTOut,
      minBPTOut,
    };
  };

  encodeJoinPool = ({
    poolId,
    joiner,
    poolTokens,
    sortedAmountsIn,
    amountsIn,
    tokensIn,
    minBPTOut,
  }: EncodeJoinPoolParams): Pick<
    JoinPoolAttributes,
    'value' | 'data' | 'to' | 'functionName' | 'attributes'
  > => {
    const userData = StablePoolEncoder.joinExactTokensInForBPTOut(
      sortedAmountsIn,
      minBPTOut
    );

    const to = balancerVault;
    const functionName = 'joinPool';
    const attributes: JoinPool = {
      poolId,
      sender: joiner,
      recipient: joiner,
      joinPoolRequest: {
        assets: poolTokens,
        maxAmountsIn: sortedAmountsIn,
        userData,
        fromInternalBalance: false,
      },
    };
    const vaultInterface = Vault__factory.createInterface();
    // encode transaction data into an ABI byte string which can be sent to the network to be executed
    const data = vaultInterface.encodeFunctionData(functionName, [
      attributes.poolId,
      attributes.sender,
      attributes.recipient,
      attributes.joinPoolRequest,
    ]);

    // If joining with a native asset value must be set in call
    const value = getEthValue(tokensIn, amountsIn);

    return {
      attributes,
      data,
      functionName,
      to,
      value,
    };
  };
}
