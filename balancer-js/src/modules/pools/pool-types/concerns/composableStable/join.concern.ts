import {
  JoinPoolParameters,
  JoinConcern,
  JoinPoolAttributes,
  JoinPool,
} from '../types';
import { StableMathBigInt } from '@balancer-labs/sor';
import { BalancerError, BalancerErrorCode } from '@/balancerErrors';
import { AssetHelpers, parsePoolInfo } from '@/lib/utils';
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

    const {
      parsedTokens,
      parsedBalances,
      parsedAmp,
      parsedSwapFee,
      parsedTotalShares,
      scalingFactors,
    } = parsePoolInfo(pool);
    if (!parsedAmp) {
      throw new BalancerError(BalancerErrorCode.MISSING_AMP);
    }

    const assetHelpers = new AssetHelpers(wrappedNativeAsset);
    const [, sortedAmounts] = assetHelpers.sortTokens(tokensIn, amountsIn) as [
      string[],
      string[]
    ];

    const [sortedTokensWithBpt, sortedBalances, sortedScalingFactors] =
      assetHelpers.sortTokens(parsedTokens, parsedBalances, scalingFactors) as [
        string[],
        string[],
        string[]
      ];
    const bptIndex = sortedTokensWithBpt.indexOf(pool.address);

    sortedAmounts.splice(bptIndex, 0, '0');

    const scaledAmounts = _upscaleArray(
      sortedAmounts.map(BigInt),
      sortedScalingFactors.map(BigInt)
    );
    sortedBalances.splice(bptIndex, 1);
    scaledAmounts.splice(bptIndex, 1);
    //NEED TO SEND SORTED BALANCES AND AMOUNTS WITHOUT BPT VALUES
    const expectedBPTOut = StableMathBigInt._calcBptOutGivenExactTokensIn(
      BigInt(parsedAmp),
      sortedBalances.map(BigInt),
      scaledAmounts.map(BigInt),
      BigInt(parsedTotalShares),
      BigInt(parsedSwapFee)
    );

    const minBPTOut = subSlippage(
      BigNumber.from(expectedBPTOut),
      BigNumber.from(slippage)
    ).toString();

    sortedAmounts.splice(bptIndex, 1);
    //NEEDS TO ENCODE USER DATA WITHOUT BPT AMOUNT
    const userData = ComposableStablePoolEncoder.joinExactTokensInForBPTOut(
      sortedAmounts,
      minBPTOut
    );

    const functionName = 'joinPool';
    sortedAmounts.splice(bptIndex, 0, '0');
    //assets AND maxAmountsIn NEEDS THE BPT VALUE IN THE ARRAY
    const attributes: JoinPool = {
      poolId: pool.id,
      sender: joiner,
      recipient: joiner,
      joinPoolRequest: {
        assets: sortedTokensWithBpt,
        maxAmountsIn: sortedAmounts,
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
    };
  };
}
