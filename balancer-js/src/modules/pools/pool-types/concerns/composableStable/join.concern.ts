import {
  JoinPoolParameters,
  JoinConcern,
  JoinPoolAttributes,
  JoinPool,
} from '../types';
import { StableMathBigInt } from '@balancer-labs/sor';
import { BalancerError, BalancerErrorCode } from '@/balancerErrors';
import { AssetHelpers, parsePoolInfo, insert } from '@/lib/utils';
import { subSlippage } from '@/lib/utils/slippageHelper';
import { BigNumber } from '@ethersproject/bignumber';
import { ComposableStablePoolEncoder } from '@/pool-composable-stable';
import { balancerVault } from '@/lib/constants/config';
import { Vault__factory } from '@balancer-labs/typechain';
import { AddressZero } from '@ethersproject/constants';
import { _upscaleArray } from '@/lib/utils/solidityMaths';

export class ComposableStablePoolJoin implements JoinConcern {
  buildJoin = ({
    joiner,
    pool,
    tokensIn,
    amountsIn,
    slippage,
    wrappedNativeAsset,
  }: JoinPoolParameters): JoinPoolAttributes => {
    if (
      tokensIn.length != amountsIn.length ||
      tokensIn.length != pool.tokensList.length - 1
    ) {
      throw new BalancerError(BalancerErrorCode.INPUT_LENGTH_MISMATCH);
    }

    if (pool.tokens.some((token) => !token.decimals))
      throw new BalancerError(BalancerErrorCode.MISSING_DECIMALS);

    const assetHelpers = new AssetHelpers(wrappedNativeAsset);

    // amountsIn must be sorted in correct order. Currently ordered with relation to tokensIn so need sorted relative to those
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
      scalingFactorsWithoutBpt,
      parsedBalancesWithoutBpt,
      bptIndex,
    } = parsePoolInfo(pool, wrappedNativeAsset);
    if (!parsedAmp) {
      throw new BalancerError(BalancerErrorCode.MISSING_AMP);
    }

    const scaledAmountsIn = _upscaleArray(
      sortedAmountsIn.map(BigInt),
      scalingFactorsWithoutBpt.map(BigInt)
    );
    //NEED TO SEND SORTED BALANCES AND AMOUNTS WITHOUT BPT VALUES
    const expectedBPTOut = StableMathBigInt._calcBptOutGivenExactTokensIn(
      BigInt(parsedAmp),
      parsedBalancesWithoutBpt.map(BigInt), // Should not have BPT
      scaledAmountsIn, // Should not have BPT
      BigInt(parsedTotalShares),
      BigInt(parsedSwapFee)
    );

    const minBPTOut = subSlippage(
      BigNumber.from(expectedBPTOut),
      BigNumber.from(slippage)
    ).toString();

    //NEEDS TO ENCODE USER DATA WITHOUT BPT AMOUNT
    const userData = ComposableStablePoolEncoder.joinExactTokensInForBPTOut(
      sortedAmountsIn,
      minBPTOut
    );

    const functionName = 'joinPool';
    //assets AND maxAmountsIn NEEDS THE BPT VALUE IN THE ARRAY
    const attributes: JoinPool = {
      poolId: pool.id,
      sender: joiner,
      recipient: joiner,
      joinPoolRequest: {
        assets: parsedTokens, // With BPT
        maxAmountsIn: insert(sortedAmountsIn, bptIndex, '0'), // Need to add value for BPT
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

    const values = amountsIn.filter((amount, i) => tokensIn[i] === AddressZero); // filter native asset (e.g. ETH) amounts
    const value = values[0] ? BigNumber.from(values[0]) : undefined;

    return {
      to: balancerVault,
      functionName,
      attributes,
      data,
      value,
      minBPTOut,
      expectedBPTOut,
    };
  };
}
