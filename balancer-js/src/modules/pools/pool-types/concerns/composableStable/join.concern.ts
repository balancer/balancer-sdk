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
    const parsedTokensBptIndex = parsedTokens.findIndex(
      (token) => token === pool.address
    );
    /***REMAPPING AMOUNTS TO BE ORDERED FOLLOWING THE parsedTokens ARRAY, AND NOT THE tokensIn, AND SCALING IT WITH scalingFactors*/
    //REMOVING BPT
    const parsedTokensWithoutBpt = [
      ...parsedTokens.slice(0, parsedTokensBptIndex),
      ...parsedTokens.slice(parsedTokensBptIndex + 1),
    ];
    //GENERATING AN ARRAY OF INDEXES, if parsedTokensWithoutBpt IS [a,b,c] AND tokensIn IS [c,a,b], tokensInIndexesOnParsedTokens WILL BE [2,0,1]
    const tokensInIndexesOnParsedTokens = parsedTokensWithoutBpt.map(
      (tokenAddress) => tokensIn.indexOf(tokenAddress)
    );
    const amountsSortedByParsedTokens = tokensInIndexesOnParsedTokens.map(
      (tokenIndex) => amountsIn[tokenIndex]
    );
    const amountsSortedByParsedTokensWithBpt = [
      ...amountsSortedByParsedTokens.slice(0, parsedTokensBptIndex),
      '0',
      ...amountsSortedByParsedTokens.slice(parsedTokensBptIndex),
    ];
    const scaledAmountsSortedByParsedTokensWithBpt = _upscaleArray(
      amountsSortedByParsedTokensWithBpt.map(BigInt),
      scalingFactors.map(BigInt)
    );
    /***/

    const [sortedTokens, sortedAmounts, sortedBalances] =
      assetHelpers.sortTokens(
        parsedTokens,
        scaledAmountsSortedByParsedTokensWithBpt,
        parsedBalances
      ) as [string[], string[], string[]];

    //THE sortedTokens BPT INDEX IS DIFFERENT OF parsedTokens INDEX
    const sortedBptIndex = sortedTokens.findIndex(
      (token) => token === pool.address
    );
    //REMOVING BPT TO CALCULATE BPT OUT
    sortedBalances.splice(sortedBptIndex, 1);
    //CREATING A CLONE BECAUSE SPLICE MUTATES THE ARRAY, AND THE "attributes" VARIABLE WILL NEED sortedAmounts WITH BPT
    const sortedAmountsClone = [...sortedAmounts];
    //REMOVING BPT TO CALCULATE BPT OUT
    sortedAmountsClone.splice(sortedBptIndex, 1);

    //NEED TO SEND SORTED BALANCES AND AMOUNTS WITHOUT BPT VALUES
    const expectedBPTOut = StableMathBigInt._calcBptOutGivenExactTokensIn(
      BigInt(parsedAmp),
      sortedBalances.map(BigInt),
      sortedAmountsClone.map(BigInt),
      BigInt(parsedTotalShares),
      BigInt(parsedSwapFee)
    );

    const minBPTOut = subSlippage(
      BigNumber.from(expectedBPTOut),
      BigNumber.from(slippage)
    ).toString();

    //NEEDS TO ENCODE DATA WITHOUT BPT AMOUNT
    const userData = ComposableStablePoolEncoder.joinExactTokensInForBPTOut(
      sortedAmountsClone,
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
