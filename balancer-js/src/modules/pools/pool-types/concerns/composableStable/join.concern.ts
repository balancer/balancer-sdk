import { StableMathBigInt } from '@balancer-labs/sor';
import { BigNumber } from '@ethersproject/bignumber';

import { BalancerError, BalancerErrorCode } from '@/balancerErrors';
import { Vault__factory } from '@/contracts/factories/Vault__factory';
import { balancerVault } from '@/lib/constants/config';
import {
  AssetHelpers,
  parsePoolInfo,
  insert,
  reorderArrays,
  getEthValue,
} from '@/lib/utils';
import { subSlippage } from '@/lib/utils/slippageHelper';
import { _upscaleArray } from '@/lib/utils/solidityMaths';
import { ComposableStablePoolEncoder } from '@/pool-composable-stable';
import { Pool } from '@/types';

import { StablePoolPriceImpact } from '../stable/priceImpact.concern';
import {
  JoinPoolParameters,
  JoinConcern,
  JoinPoolAttributes,
  JoinPool,
} from '../types';
import { AddressZero } from '@ethersproject/constants';

interface SortedValues {
  sortedAmountsIn: string[];
  scalingFactorsWithoutBpt: bigint[];
  upScaledBalancesWithoutBpt: bigint[];
  ampWithPrecision: bigint;
  totalSharesEvm: bigint;
  swapFeeEvm: bigint;
  bptIndex: number;
  poolTokens: string[];
}

type SortedInputs = SortedValues &
  Pick<JoinPoolParameters, 'slippage' | 'joiner'> & {
    poolId: string;
  };

export class ComposableStablePoolJoin implements JoinConcern {
  buildJoin = ({
    joiner,
    pool,
    tokensIn,
    amountsIn,
    slippage,
    wrappedNativeAsset,
  }: JoinPoolParameters): JoinPoolAttributes => {
    this.checkInputs(tokensIn, amountsIn, pool.tokensList);

    const sortedValues = this.sortValuesBasedOnPoolVersion({
      pool,
      wrappedNativeAsset,
      amountsIn,
      tokensIn,
    });

    const encodedData = this.buildExactTokensInForBPTOut({
      ...sortedValues,
      slippage,
      joiner,
      poolId: pool.id,
    });

    // If joining with a native asset value must be set in call
    const value = getEthValue(tokensIn, amountsIn);

    const priceImpactConcern = new StablePoolPriceImpact();
    const priceImpact = priceImpactConcern.calcPriceImpact(
      pool,
      sortedValues.sortedAmountsIn.map(BigInt),
      BigInt(encodedData.expectedBPTOut),
      true
    );

    return {
      ...encodedData,
      to: balancerVault,
      value,
      priceImpact,
    };
  };

  /**
   * Sorts inputs and pool value to be correct order and scale for maths and Vault interaction.
   * @param pool Pool data
   * @param wrappedNativeAsset (Used for sorting)
   * @param amountsIn Downscaled amounts in
   * @param tokensIn Addresses of token in
   * @returns Sorted values
   */
  sortValuesBasedOnPoolVersion({
    pool,
    wrappedNativeAsset,
    amountsIn,
    tokensIn,
  }: Pick<
    JoinPoolParameters,
    'pool' | 'wrappedNativeAsset' | 'amountsIn' | 'tokensIn'
  >): SortedValues {
    /**
     * V1: Does not have proportional exits.
     * V2: Reintroduced proportional exits. Has vulnerability.
     * V3: Fixed vulnerability. Functionally the same as V2.
     * V4: Update to use new create method with new salt parameter
     * V5: Fixed vulnerability. Functionally the same as V4.
     */
    return this.sortV1(wrappedNativeAsset, tokensIn, amountsIn, pool);
    // Not release yet and needs tests to confirm
    // else if (values.pool.poolTypeVersion === 5)
    //   sortedValues = this.sortV4(
    //     values.tokensIn,
    //     values.amountsIn,
    //     values.pool
    //   );
  }

  /**
   * Ensure tokensIn and amountsIn match pool tokens length
   * @param tokensIn
   * @param amountsIn
   * @param poolTokens
   */
  checkInputs(
    tokensIn: string[],
    amountsIn: string[],
    poolTokens: string[]
  ): void {
    if (
      tokensIn.length != amountsIn.length ||
      tokensIn.length != poolTokens.length - 1
    ) {
      throw new BalancerError(BalancerErrorCode.INPUT_LENGTH_MISMATCH);
    }
  }

  /**
   * Encodes user data with slippage applied to expected BPT out.
   * @param expectedBPTOut
   * @param slippage
   * @param amountsIn
   * @returns
   */
  encodeUserDataExactTokensInForBPTOut(
    expectedBPTOut: bigint,
    slippage: string,
    amountsIn: string[]
  ): { userData: string; minBPTOut: string } {
    const minBPTOut = subSlippage(
      BigNumber.from(expectedBPTOut),
      BigNumber.from(slippage)
    ).toString();

    //NEEDS TO ENCODE USER DATA WITHOUT BPT AMOUNT
    return {
      userData: ComposableStablePoolEncoder.joinExactTokensInForBPTOut(
        amountsIn, // No BPT amount
        minBPTOut
      ),
      minBPTOut,
    };
  }

  /**
   * Encode transaction data into an ABI byte string which can be sent to the network to be executed
   * @param poolId
   * @param sender
   * @param recipient
   * @param assetsWithBpt
   * @param encodedUserData
   * @param maxAmountsInWithBpt
   * @returns
   */
  encodeJoinPool(
    poolId: string,
    sender: string,
    recipient: string,
    assetsWithBpt: string[],
    encodedUserData: string,
    maxAmountsInWithBpt: string[]
  ): Pick<JoinPoolAttributes, 'functionName' | 'attributes' | 'data'> {
    const functionName = 'joinPool';
    //assets AND maxAmountsIn NEEDS THE BPT VALUE IN THE ARRAY
    const attributes: JoinPool = {
      poolId,
      sender,
      recipient,
      joinPoolRequest: {
        assets: assetsWithBpt,
        maxAmountsIn: maxAmountsInWithBpt,
        userData: encodedUserData,
        fromInternalBalance: false,
      },
    };

    const vaultInterface = Vault__factory.createInterface();

    const data = vaultInterface.encodeFunctionData(functionName, [
      attributes.poolId,
      attributes.sender,
      attributes.recipient,
      attributes.joinPoolRequest,
    ]);

    return {
      functionName,
      attributes,
      data,
    };
  }

  /**
   * Sorts and scales values correctly for V1-V3 ComposableStable pool.
   * @param wrappedNativeAsset (Used for sorting)
   * @param tokensIn Addresses of token in
   * @param amountsIn Downscaled amounts in
   * @param pool Pool data
   * @returns Sorted values
   */
  sortV1(
    wrappedNativeAsset: string,
    tokensIn: string[],
    amountsIn: string[],
    pool: Pool
  ): SortedValues {
    const assetHelpers = new AssetHelpers(wrappedNativeAsset);
    // Sorts amounts in into ascending order (referenced to token addresses) to match the format expected by the Vault.
    const [, sortedAmountsIn] = assetHelpers.sortTokens(
      tokensIn,
      amountsIn
    ) as [string[], string[]];

    const {
      poolTokens,
      ampWithPrecision,
      swapFeeEvm,
      totalSharesEvm,
      bptIndex,
      scalingFactorsWithoutBpt,
      upScaledBalancesWithoutBpt,
    } = parsePoolInfo(pool, wrappedNativeAsset, tokensIn.includes(AddressZero));
    return {
      sortedAmountsIn,
      scalingFactorsWithoutBpt,
      upScaledBalancesWithoutBpt,
      ampWithPrecision,
      totalSharesEvm,
      swapFeeEvm,
      bptIndex,
      poolTokens,
    };
  }

  buildExactTokensInForBPTOut(
    sortedValues: SortedInputs
  ): Pick<
    JoinPoolAttributes,
    'minBPTOut' | 'functionName' | 'attributes' | 'data' | 'expectedBPTOut'
  > {
    const {
      sortedAmountsIn,
      scalingFactorsWithoutBpt,
      upScaledBalancesWithoutBpt,
      ampWithPrecision,
      totalSharesEvm,
      swapFeeEvm,
      bptIndex,
      poolTokens,
      slippage,
      poolId,
      joiner,
    } = sortedValues;
    // BPT out will be in correct scale and price rate is always 1e18 do doesn't need to be considered
    // Maths needs to have BPT values removed
    const expectedBPTOut = this.calcBptOutGivenExactTokensIn(
      sortedAmountsIn,
      scalingFactorsWithoutBpt,
      upScaledBalancesWithoutBpt,
      ampWithPrecision,
      totalSharesEvm,
      swapFeeEvm
    );

    const userData = this.encodeUserDataExactTokensInForBPTOut(
      expectedBPTOut,
      slippage,
      sortedAmountsIn
    );

    const { functionName, data, attributes } = this.encodeJoinPool(
      poolId,
      joiner,
      joiner,
      poolTokens,
      userData.userData,
      insert(sortedAmountsIn, bptIndex, '0') // Adds value for BPT
    );

    return {
      functionName,
      data,
      attributes,
      minBPTOut: userData.minBPTOut,
      expectedBPTOut: expectedBPTOut.toString(),
    };
  }

  calcBptOutGivenExactTokensIn(
    amountsIn: string[],
    scalingFactorsWithoutBpt: bigint[],
    upScaledBalancesWithoutBpt: bigint[],
    ampWithPrecision: bigint,
    totalSharesEvm: bigint,
    swapFeeEvm: bigint
  ): bigint {
    /*
      Maths should use: 
      - upscaled amounts, e.g. 1USDC = 1e18
      - rates (scaling factors should include these)
    */
    const upScaledAmountsIn = _upscaleArray(
      amountsIn.map(BigInt),
      scalingFactorsWithoutBpt.map(BigInt)
    );
    const expectedBPTOut = StableMathBigInt._calcBptOutGivenExactTokensIn(
      ampWithPrecision,
      upScaledBalancesWithoutBpt,
      upScaledAmountsIn, // Should not have BPT
      totalSharesEvm,
      swapFeeEvm
    );
    // BPT out will be in correct scale and price rate is always 1e18 do doesn't need to be considered
    return expectedBPTOut;
  }

  // This uses sorting where BPT is always at index 0.
  // Not currently released but keep for when it is.
  sortV4(tokensIn: string[], amountsIn: string[], pool: Pool): SortedValues {
    // This will keep ordering as read from Pool
    const {
      poolTokens,
      poolTokensWithoutBpt,
      ampWithPrecision,
      swapFeeEvm,
      totalSharesEvm,
      scalingFactorsWithoutBpt,
      upScaledBalancesWithoutBpt,
    } = parsePoolInfo(pool);

    // Reorder amountsIn to match pool token order TODO - May have issues when adding native tokens to this mix.
    const [sortedAmountsIn] = reorderArrays(
      poolTokensWithoutBpt,
      tokensIn,
      amountsIn
    ) as [string[]];
    return {
      sortedAmountsIn,
      scalingFactorsWithoutBpt,
      upScaledBalancesWithoutBpt,
      ampWithPrecision,
      totalSharesEvm,
      swapFeeEvm,
      bptIndex: 0,
      poolTokens,
    };
  }
}
