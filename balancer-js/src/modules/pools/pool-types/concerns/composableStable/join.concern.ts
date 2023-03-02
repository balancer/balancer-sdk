import {
  JoinPoolParameters,
  JoinConcern,
  JoinPoolAttributes,
  JoinPool,
} from '../types';
import { StableMathBigInt } from '@balancer-labs/sor';
import { BalancerError, BalancerErrorCode } from '@/balancerErrors';
import {
  AssetHelpers,
  parsePoolInfo,
  insert,
  reorderArrays,
  getEthValue,
} from '@/lib/utils';
import { subSlippage } from '@/lib/utils/slippageHelper';
import { BigNumber } from '@ethersproject/bignumber';
import { ComposableStablePoolEncoder } from '@/pool-composable-stable';
import { balancerVault } from '@/lib/constants/config';
import { Vault__factory } from '@/contracts/factories/Vault__factory';
import { _upscaleArray } from '@/lib/utils/solidityMaths';
import { Pool } from '@/types';

interface SortedValues {
  sortedAmountsIn: string[];
  scalingFactorsWithoutBpt: bigint[];
  upScaledBalancesWithoutBpt: string[];
  parsedAmp: string;
  parsedTotalShares: string;
  parsedSwapFee: string;
  bptIndex: number;
  parsedTokens: string[];
}

type SortedInputs = SortedValues &
  Pick<JoinPoolParameters, 'slippage' | 'joiner'> & {
    poolId: string;
  };

export class ComposableStablePoolJoin implements JoinConcern {
  buildJoin = (joinParams: JoinPoolParameters): JoinPoolAttributes => {
    this.checkInputs(
      joinParams.tokensIn,
      joinParams.amountsIn,
      joinParams.pool.tokensList
    );

    const sortedValues = this.sortValuesBasedOnPoolVersion(joinParams);

    const encodedData = this.buildExactTokensInForBPTOut({
      ...sortedValues,
      slippage: joinParams.slippage,
      joiner: joinParams.joiner,
      poolId: joinParams.pool.id,
    });

    // If joining with a native asset value must be set in call
    const value = getEthValue(joinParams.tokensIn, joinParams.amountsIn);

    return {
      ...encodedData,
      to: balancerVault,
      value,
    };
  };

  /**
   * Sorts inputs and pool value to be correct order and scale for maths and Vault interaction.
   * @param values
   * @returns
   */
  sortValuesBasedOnPoolVersion(
    values: Pick<
      JoinPoolParameters,
      'pool' | 'wrappedNativeAsset' | 'amountsIn' | 'tokensIn'
    >
  ): SortedValues {
    /**
     * V1: Does not have proportional exits.
     * V2: Reintroduced proportional exits. Has vulnerability.
     * V3: Fixed vulnerability. Functionally the same as V2.
     */
    if (values.pool.poolTypeVersion < 4)
      return this.sortV1(
        values.wrappedNativeAsset,
        values.tokensIn,
        values.amountsIn,
        values.pool
      );
    // Not release yet and needs tests to confirm
    // else if (values.pool.poolTypeVersion === 4)
    //   sortedValues = this.sortV4(
    //     values.tokensIn,
    //     values.amountsIn,
    //     values.pool
    //   );
    else
      throw new Error(
        `Unsupported ComposablePool Version ${values.pool.poolTypeVersion}`
      );
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
      parsedTokens,
      parsedAmp,
      parsedSwapFee,
      parsedTotalShares,
      bptIndex,
      scalingFactorsWithoutBpt,
      upScaledBalancesWithoutBpt,
    } = parsePoolInfo(pool, wrappedNativeAsset);
    if (!parsedAmp) {
      throw new BalancerError(BalancerErrorCode.MISSING_AMP);
    }
    return {
      sortedAmountsIn,
      scalingFactorsWithoutBpt,
      upScaledBalancesWithoutBpt,
      parsedAmp,
      parsedTotalShares,
      parsedSwapFee,
      bptIndex,
      parsedTokens,
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
      parsedAmp,
      parsedTotalShares,
      parsedSwapFee,
      bptIndex,
      parsedTokens,
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
      parsedAmp,
      parsedTotalShares,
      parsedSwapFee
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
      parsedTokens,
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
    upScaledBalancesWithoutBpt: string[],
    upscaledAmp: string,
    upscaledTotalShares: string,
    upscaledSwapFee: string
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
      BigInt(upscaledAmp),
      upScaledBalancesWithoutBpt.map(BigInt), // Should not have BPT
      upScaledAmountsIn, // Should not have BPT
      BigInt(upscaledTotalShares),
      BigInt(upscaledSwapFee)
    );
    // BPT out will be in correct scale and price rate is always 1e18 do doesn't need to be considered
    return expectedBPTOut;
  }

  // This uses sorting where BPT is always at index 0.
  // Not currently released but keep for when it is.
  sortV4(tokensIn: string[], amountsIn: string[], pool: Pool): SortedValues {
    // This will keep ordering as read from Pool
    const {
      parsedTokens,
      parsedTokensWithoutBpt,
      parsedAmp,
      parsedSwapFee,
      parsedTotalShares,
      scalingFactorsWithoutBpt,
      upScaledBalancesWithoutBpt,
    } = parsePoolInfo(pool);
    if (!parsedAmp) {
      throw new BalancerError(BalancerErrorCode.MISSING_AMP);
    }
    // Reorder amountsIn to match pool token order TODO - May have issues when adding native tokens to this mix.
    const [sortedAmountsIn] = reorderArrays(
      parsedTokensWithoutBpt,
      tokensIn,
      amountsIn
    ) as [string[]];
    return {
      sortedAmountsIn,
      scalingFactorsWithoutBpt,
      upScaledBalancesWithoutBpt,
      parsedAmp,
      parsedTotalShares,
      parsedSwapFee,
      bptIndex: 0,
      parsedTokens,
    };
  }
}
