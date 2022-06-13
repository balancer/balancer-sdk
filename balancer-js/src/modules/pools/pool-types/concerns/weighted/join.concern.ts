import { Interface } from '@ethersproject/abi';
import { parseUnits } from '@ethersproject/units';
import OldBigNumber from 'bignumber.js';
import * as SDK from '@georgeroman/balancer-v2-pools';

import vaultAbi from '@/lib/abi/Vault.json';
import { WeightedPoolEncoder } from '@/pool-weighted';
import { SubgraphPoolBase } from '@balancer-labs/sor';
import {
  JoinConcern,
  JoinPool,
  JoinPoolAttributes,
  ExactTokensInJoinPoolParameters,
} from '../types';
import { JoinPoolRequest } from '@/types';
import { subSlippage } from '@/lib/utils/slippageHelper';
import { AssetHelpers } from '@/lib/utils';
import { balancerVault } from '@/lib/constants/config';

export class WeightedPoolJoin implements JoinConcern {
  static encodeJoinPool({
    poolId,
    sender,
    recipient,
    joinPoolRequest,
  }: JoinPool): string {
    const vaultLibrary = new Interface(vaultAbi);

    return vaultLibrary.encodeFunctionData('joinPool', [
      poolId,
      sender,
      recipient,
      joinPoolRequest,
    ]);
  }

  // Join Concern Intereface

  async buildExactTokensInJoinPool({
    joiner,
    pool,
    tokensIn,
    amountsIn,
    slippage,
  }: ExactTokensInJoinPoolParameters): Promise<JoinPoolAttributes> {
    if (
      tokensIn.length != amountsIn.length ||
      tokensIn.length != pool.tokensList.length
    ) {
      throw new Error('Must provide amount for all tokens in the pool');
    }
    const [sortedTokensIn, parsedAmountsIn, parsedMinBPTOut] =
      this.calcBptOutGivenExactTokensIn(pool, tokensIn, amountsIn, slippage);

    const userData = WeightedPoolEncoder.joinExactTokensInForBPTOut(
      parsedAmountsIn,
      parsedMinBPTOut
    );

    const to = balancerVault;
    const functionName = 'joinPool';
    const attributes: JoinPool = {
      poolId: pool.id,
      sender: joiner,
      recipient: joiner,
      joinPoolRequest: {
        assets: sortedTokensIn,
        maxAmountsIn: parsedAmountsIn,
        userData,
        fromInternalBalance: false,
      },
    };
    const data = WeightedPoolJoin.encodeJoinPool(attributes);

    return { to, functionName, attributes, data };
  }

  private sortPoolInfo(
    pool: SubgraphPoolBase,
    tokensIn: string[],
    amountsIn: string[]
  ): [
    sortedTokens: string[],
    sortedBalances: string[],
    sortedWeights: string[],
    sortedAmounts: string[],
    sortedDecimals: string[]
  ] {
    const WETH = '0x000000000000000000000000000000000000000F';
    const assetHelpers = new AssetHelpers(WETH);
    const [sortedTokensIn, sortedAmounts] = assetHelpers.sortTokens(
      tokensIn,
      amountsIn
    ) as [string[], string[]];
    const [sortedTokens, sortedBalances, sortedWeights, sortedDecimals] =
      assetHelpers.sortTokens(
        pool.tokens.map((token) => token.address),
        pool.tokens.map((token) => token.balance),
        pool.tokens.map((token) => token.weight),
        pool.tokens.map((token) => token.decimals)
      ) as [string[], string[], string[], string[]];
    return [
      sortedTokens,
      sortedBalances,
      sortedWeights,
      sortedAmounts,
      sortedDecimals,
    ];
  }

  private parseCalcInputs(
    sortedBalances: string[],
    sortedWeights: string[],
    sortedAmounts: string[],
    sortedDecimals: string[],
    totalShares: string,
    swapFee: string
  ): [
    parsedBalances: OldBigNumber[],
    parsedWeights: OldBigNumber[],
    parsedAmounts: OldBigNumber[],
    parsedTotalShares: OldBigNumber,
    parsedSwapFee: OldBigNumber
  ] {
    const bnum = (val: string | number | OldBigNumber): OldBigNumber => {
      const number = typeof val === 'string' ? val : val ? val.toString() : '0';
      return new OldBigNumber(number);
    };
    const _parsedBalances = sortedBalances.map((balance, i) =>
      bnum(parseUnits(balance, sortedDecimals[i]).toString())
    );
    const _parsedWeights = sortedWeights.map((weight) =>
      bnum(parseUnits(weight).toString())
    );
    const _parsedAmounts = sortedAmounts.map((amount, i) =>
      bnum(parseUnits(amount, sortedDecimals[i]).toString())
    );
    const _parsedTotalShares = bnum(parseUnits(totalShares).toString());
    const _parsedSwapFee = bnum(parseUnits(swapFee).toString());
    return [
      _parsedBalances,
      _parsedWeights,
      _parsedAmounts,
      _parsedTotalShares,
      _parsedSwapFee,
    ];
  }

  private calcBptOutGivenExactTokensIn(
    pool: SubgraphPoolBase,
    tokensIn: string[],
    amountsIn: string[],
    slippage?: string
  ): [string[], string[], string] {
    const [
      sortedTokens,
      sortedBalances,
      sortedWeights,
      sortedAmounts,
      sortedDecimals,
    ] = this.sortPoolInfo(pool, tokensIn, amountsIn);

    const [
      parsedBalances,
      parsedWeights,
      parsedAmounts,
      parsedTotalShares,
      parsedSwapFee,
    ] = this.parseCalcInputs(
      sortedBalances,
      sortedWeights,
      sortedAmounts,
      sortedDecimals,
      pool.totalShares,
      pool.swapFee
    );

    let fullBPTOut = SDK.WeightedMath._calcBptOutGivenExactTokensIn(
      parsedBalances,
      parsedWeights,
      parsedAmounts,
      parsedTotalShares,
      parsedSwapFee
    ).toString();

    if (slippage) {
      fullBPTOut = subSlippage(fullBPTOut, 0, slippage);
    }
    return [
      sortedTokens,
      parsedAmounts.map((amount) => amount.toString()),
      fullBPTOut,
    ];
  }
}
