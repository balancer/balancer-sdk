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
import { BigNumber, parseFixed } from '@ethersproject/bignumber';
import { ComposableStablePoolEncoder } from '@/pool-composable-stable';
import { balancerVault } from '@/lib/constants/config';
import { Vault__factory } from '@balancer-labs/typechain';
import { AddressZero } from '@ethersproject/constants';

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
    } = parsePoolInfo(pool);

    if (!parsedAmp) {
      throw new BalancerError(BalancerErrorCode.MISSING_AMP);
    }

    const bptIndex = parsedTokens.findIndex((token) => token === pool.address);
    const parseFixedAmounts = amountsIn.map((amount) =>
      parseFixed(amount, 18).toString()
    );
    const assetHelpers = new AssetHelpers(wrappedNativeAsset);
    const [, sortedAmountsWithTokensIn] = assetHelpers.sortTokens(
      tokensIn,
      parseFixedAmounts
    ) as [string[], string[]];
    // sort inputs

    const [sortedTokens, sortedAmounts, sortedBalances] =
      assetHelpers.sortTokens(
        parsedTokens,
        [
          ...sortedAmountsWithTokensIn.slice(0, bptIndex),
          '0',
          ...sortedAmountsWithTokensIn.slice(bptIndex),
        ],
        parsedBalances
      ) as [string[], string[], string[]];

    console.log(BigInt(parsedAmp));
    console.log(sortedBalances.map(BigInt));
    console.log(sortedAmounts.map(BigInt));
    console.log(BigInt(parsedTotalShares));
    console.log(BigInt(parsedSwapFee));

    const expectedBPTOut = StableMathBigInt._calcBptOutGivenExactTokensIn(
      BigInt(parsedAmp),
      sortedBalances.map(BigInt),
      sortedAmounts.map(BigInt),
      BigInt(parsedTotalShares),
      BigInt(parsedSwapFee)
    );

    const minBPTOut = subSlippage(
      BigNumber.from(expectedBPTOut),
      BigNumber.from(slippage)
    ).toString();

    const userData = ComposableStablePoolEncoder.joinExactTokensInForBPTOut(
      [
        ...sortedAmounts.slice(0, bptIndex),
        ...sortedBalances.slice(bptIndex + 1),
      ],
      minBPTOut
    );

    const functionName = 'joinPool';

    const attributes: JoinPool = {
      poolId: pool.id,
      sender: joiner,
      recipient: joiner,
      joinPoolRequest: {
        assets: sortedTokens,
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
