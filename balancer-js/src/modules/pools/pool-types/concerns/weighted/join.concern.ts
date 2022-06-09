import { Interface } from '@ethersproject/abi';
import { parseUnits } from '@ethersproject/units';
import OldBigNumber from 'bignumber.js';
import * as SDK from '@georgeroman/balancer-v2-pools';

import vaultAbi from '@/lib/abi/Vault.json';
import { WeightedPoolEncoder } from '@/pool-weighted';
import { SubgraphPoolBase } from '@balancer-labs/sor';
import {
  JoinConcern,
  JoinPoolData,
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

  static constructJoinCall({
    assets,
    maxAmountsIn,
    userData,
    fromInternalBalance,
    poolId,
    sender,
    recipient,
  }: JoinPoolData): string {
    const joinPoolRequest: JoinPoolRequest = {
      assets,
      maxAmountsIn,
      userData,
      fromInternalBalance,
    };

    const joinPoolInput: JoinPool = {
      poolId,
      sender,
      recipient,
      joinPoolRequest,
    };

    const joinEncoded = WeightedPoolJoin.encodeJoinPool(joinPoolInput);
    return joinEncoded;
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
    const [sortedTokensIn, normalizedAmountsIn, normalizedMinBPTOut] =
      this.calcBptOutGivenExactTokensIn(pool, tokensIn, amountsIn, slippage);

    const userData = WeightedPoolEncoder.joinExactTokensInForBPTOut(
      normalizedAmountsIn,
      normalizedMinBPTOut
    );

    const joinPoolData: JoinPoolData = {
      assets: sortedTokensIn,
      maxAmountsIn: normalizedAmountsIn,
      userData,
      fromInternalBalance: false,
      poolId: pool.id,
      sender: joiner,
      recipient: joiner,
      joinPoolRequest: {} as JoinPoolRequest,
    };

    const data = WeightedPoolJoin.constructJoinCall(joinPoolData);
    const to = balancerVault;
    const functionName = 'joinPool';
    const attributes: JoinPool = {
      poolId: pool.id,
      sender: joiner,
      recipient: joiner,
      joinPoolRequest: {
        assets: sortedTokensIn,
        maxAmountsIn: normalizedAmountsIn,
        userData: userData,
        fromInternalBalance: false,
      },
    };

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

  private normalizeCalcInputs(
    sortedBalances: string[],
    sortedWeights: string[],
    sortedAmounts: string[],
    sortedDecimals: string[],
    totalShares: string,
    swapFee: string
  ): [
    normalizedBalances: OldBigNumber[],
    normalizedWeights: OldBigNumber[],
    normalizedAmounts: OldBigNumber[],
    normalizedTotalShares: OldBigNumber,
    normalizedSwapFee: OldBigNumber
  ] {
    const bnum = (val: string | number | OldBigNumber): OldBigNumber => {
      const number = typeof val === 'string' ? val : val ? val.toString() : '0';
      return new OldBigNumber(number);
    };
    const _normalizedBalances = sortedBalances.map((balance, i) =>
      bnum(parseUnits(balance, sortedDecimals[i]).toString())
    );
    const _normalizedWeights = sortedWeights.map((weight) =>
      bnum(parseUnits(weight).toString())
    );
    const _normalizedAmounts = sortedAmounts.map((amount, i) =>
      bnum(parseUnits(amount, sortedDecimals[i]).toString())
    );
    const _normalizedTotalShares = bnum(parseUnits(totalShares).toString());
    const _normalizedSwapFee = bnum(parseUnits(swapFee).toString());
    return [
      _normalizedBalances,
      _normalizedWeights,
      _normalizedAmounts,
      _normalizedTotalShares,
      _normalizedSwapFee,
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
      normalizedBalances,
      normalizedWeights,
      normalizedAmounts,
      normalizedTotalShares,
      normalizedSwapFee,
    ] = this.normalizeCalcInputs(
      sortedBalances,
      sortedWeights,
      sortedAmounts,
      sortedDecimals,
      pool.totalShares,
      pool.swapFee
    );

    let fullBPTOut = SDK.WeightedMath._calcBptOutGivenExactTokensIn(
      normalizedBalances,
      normalizedWeights,
      normalizedAmounts,
      normalizedTotalShares,
      normalizedSwapFee
    ).toString();

    if (slippage) {
      fullBPTOut = subSlippage(fullBPTOut, 0, slippage);
    }
    return [
      sortedTokens,
      normalizedAmounts.map((amount) => amount.toString()),
      fullBPTOut,
    ];
  }
}
