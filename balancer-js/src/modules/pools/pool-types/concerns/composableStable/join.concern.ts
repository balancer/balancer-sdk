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
} from '@/lib/utils';
import { subSlippage } from '@/lib/utils/slippageHelper';
import { BigNumber } from '@ethersproject/bignumber';
import { ComposableStablePoolEncoder } from '@/pool-composable-stable';
import { balancerVault } from '@/lib/constants/config';
import { Vault__factory } from '@balancer-labs/typechain';
import { AddressZero } from '@ethersproject/constants';
import { _upscale, _upscaleArray } from '@/lib/utils/solidityMaths';
import { Pool } from '@/types';

interface SortedValues {
  sortedAmountsIn: string[];
  scalingFactorsWithoutBpt: bigint[];
  upScaledBalancesWithoutBpt: string[];
  parsedAmp: string;
  parsedTotalShares: string;
  parsedPriceRatesWithoutBpt: string[];
  parsedSwapFee: string;
  bptIndex: number;
  parsedTokens: string[];
}

type Params = SortedValues &
  Pick<JoinPoolParameters, 'slippage' | 'joiner'> & {
    poolId: string;
    value: BigNumber | undefined;
  };

export class ComposableStablePoolJoin implements JoinConcern {
  buildJoin = (joinParams: JoinPoolParameters): JoinPoolAttributes => {
    this.checkInputs(
      joinParams.tokensIn,
      joinParams.amountsIn,
      joinParams.pool.tokensList
    );

    const value = this.getEthValue(joinParams.tokensIn, joinParams.amountsIn);
    let sortedValues: SortedValues;

    if (joinParams.pool.poolTypeVersion === 1)
      sortedValues = this.sortV1(
        joinParams.wrappedNativeAsset,
        joinParams.tokensIn,
        joinParams.amountsIn,
        joinParams.pool
      );
    else if (
      joinParams.pool.poolTypeVersion === 2 ||
      joinParams.pool.poolTypeVersion === 3
    )
      sortedValues = this.sortV2(
        joinParams.tokensIn,
        joinParams.amountsIn,
        joinParams.pool
      );
    else
      throw new Error(
        `Unsupported ComposableStable Version ${joinParams.pool.poolTypeVersion}`
      );

    return this.doJoin({
      ...sortedValues,
      slippage: joinParams.slippage,
      joiner: joinParams.joiner,
      poolId: joinParams.pool.id,
      value,
    });
  };

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

  encodeUserData(
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

  encodeFunctionData(
    poolId: string,
    sender: string,
    recipient: string,
    assetsWithBpt: string[],
    userData: string,
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

    return {
      functionName,
      attributes,
      data,
    };
  }

  sortV1(
    wrappedNativeAsset: string,
    tokensIn: string[],
    amountsIn: string[],
    pool: Pool
  ): SortedValues {
    const assetHelpers = new AssetHelpers(wrappedNativeAsset);
    // amountsIn must be sorted in correct order for Vault interaction. Currently ordered with relation to tokensIn so need sorted relative to those
    const [, sortedAmountsIn] = assetHelpers.sortTokens(
      tokensIn,
      amountsIn
    ) as [string[], string[]];

    // This will order everything correctly based on pool tokens
    const {
      parsedTokens,
      parsedAmp,
      parsedSwapFee,
      parsedTotalShares,
      parsedPriceRatesWithoutBpt,
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
      parsedPriceRatesWithoutBpt,
      bptIndex,
      parsedTokens,
    };
  }

  doJoin(sortedValues: Params): JoinPoolAttributes {
    const {
      sortedAmountsIn,
      scalingFactorsWithoutBpt,
      upScaledBalancesWithoutBpt,
      parsedAmp,
      parsedTotalShares,
      parsedSwapFee,
      parsedPriceRatesWithoutBpt,
      bptIndex,
      parsedTokens,
      slippage,
      poolId,
      joiner,
      value,
    } = sortedValues;

    // BPT out doesn't need downscaled or priceRate
    const expectedBPTOut = this.doMaths(
      sortedAmountsIn,
      scalingFactorsWithoutBpt,
      upScaledBalancesWithoutBpt,
      parsedAmp,
      parsedTotalShares,
      parsedSwapFee,
      parsedPriceRatesWithoutBpt
    );

    const userData = this.encodeUserData(
      expectedBPTOut,
      slippage,
      sortedAmountsIn
    );

    const data = this.encodeFunctionData(
      poolId,
      joiner,
      joiner,
      parsedTokens,
      userData.userData,
      insert(sortedAmountsIn, bptIndex, '0') // Adds value for BPT
    );

    return {
      ...data,
      to: balancerVault,
      value,
      minBPTOut: userData.minBPTOut,
    };
  }

  // filter native asset (e.g. ETH) amounts
  getEthValue(tokens: string[], amounts: string[]): BigNumber | undefined {
    const values = amounts.filter((amount, i) => tokens[i] === AddressZero);
    return values[0] ? BigNumber.from(values[0]) : undefined;
  }

  doMaths(
    amountsIn: string[],
    scalingFactorsWithoutBpt: bigint[],
    upScaledBalancesWithoutBpt: string[],
    upscaledAmp: string,
    upscaledTotalShares: string,
    upscaledSwapFee: string,
    parsedPriceRatesWithoutBpt: string[]
  ): bigint {
    /*
      Maths should use: 
      - upscaled amounts, e.g. 1USDC = 1e18
      - rates
    */
    const upScaledAmountsInPriceRated = _upscaleArray(
      amountsIn.map(BigInt),
      scalingFactorsWithoutBpt.map((scalingFactor, i) =>
        _upscale(BigInt(scalingFactor), BigInt(parsedPriceRatesWithoutBpt[i]))
      )
    );

    const upScaledBalancesPriceRated = _upscaleArray(
      upScaledBalancesWithoutBpt.map(BigInt),
      parsedPriceRatesWithoutBpt.map(BigInt)
    );

    const expectedBPTOut = StableMathBigInt._calcBptOutGivenExactTokensIn(
      BigInt(upscaledAmp),
      upScaledBalancesPriceRated, // Should not have BPT
      upScaledAmountsInPriceRated, // Should not have BPT
      BigInt(upscaledTotalShares),
      BigInt(upscaledSwapFee)
    );
    // BPT out doesn't need downscaled or priceRate
    return expectedBPTOut;
  }

  sortV2(tokensIn: string[], amountsIn: string[], pool: Pool): SortedValues {
    // This will keep ordering as read from Pool
    const {
      parsedTokens,
      parsedTokensWithoutBpt,
      parsedAmp,
      parsedSwapFee,
      parsedTotalShares,
      scalingFactorsWithoutBpt,
      upScaledBalancesWithoutBpt,
      parsedPriceRatesWithoutBpt,
    } = parsePoolInfo(pool);
    if (!parsedAmp) {
      throw new BalancerError(BalancerErrorCode.MISSING_AMP);
    }
    // Reorder amountsIn to match pool token order
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
      parsedPriceRatesWithoutBpt,
    };
  }
}
