import { formatFixed, parseFixed } from '@ethersproject/bignumber';
import { parseUnits } from '@ethersproject/units';
import OldBigNumber from 'bignumber.js';
import * as SDK from '@georgeroman/balancer-v2-pools';
import {
  ExitConcern,
  ExitExactBPTInForTokensOutParameters,
  ExitPool,
  ExitPoolAttributes,
} from '../types';
import { AssetHelpers } from '@/lib/utils';
import { SubgraphPoolBase } from '@balancer-labs/sor';
import { WeightedPoolEncoder } from '@/pool-weighted';
import { subSlippage } from '@/lib/utils/slippageHelper';
import { Interface } from '@ethersproject/abi';
import vaultAbi from '@/lib/abi/Vault.json';
import { balancerVault } from '@/lib/constants/config';

export class WeightedPoolExit implements ExitConcern {
  // Static

  static encodeExitPool({
    poolId,
    sender,
    recipient,
    exitPoolRequest,
  }: ExitPool): string {
    const vaultLibrary = new Interface(vaultAbi);

    return vaultLibrary.encodeFunctionData('exitPool', [
      poolId,
      sender,
      recipient,
      exitPoolRequest,
    ]);
  }

  // Exit Concern

  async buildExitExactBPTInForTokensOut({
    exiter,
    pool,
    bptIn,
    slippage,
  }: ExitExactBPTInForTokensOutParameters): Promise<ExitPoolAttributes> {
    if (
      !bptIn.length ||
      parseFixed(bptIn, 18).isZero() ||
      parseFixed(bptIn, 18).isNegative()
    ) {
      throw new Error('Must provide bptIn greater than zero');
    }

    const [sortedTokensOut, parsedAmountsOut, parsedBptIn] =
      this.calcTokensOutGivenExactBptIn(pool, bptIn, slippage);

    const userData =
      WeightedPoolEncoder.exitExactBPTInForTokensOut(parsedBptIn);

    const to = balancerVault;
    const functionName = 'exitPool';
    const attributes: ExitPool = {
      poolId: pool.id,
      sender: exiter,
      recipient: exiter,
      exitPoolRequest: {
        assets: sortedTokensOut,
        minAmountsOut: parsedAmountsOut,
        userData,
        toInternalBalance: false,
      },
    };
    const data = WeightedPoolExit.encodeExitPool(attributes);

    return { to, functionName, attributes, data };
  }

  // Helper methods

  private sortPoolInfo(
    pool: SubgraphPoolBase
  ): [
    sortedTokens: string[],
    sortedBalances: string[],
    sortedDecimals: string[]
  ] {
    const WETH = '0x000000000000000000000000000000000000000F';
    const assetHelpers = new AssetHelpers(WETH);
    const [sortedTokens, sortedBalances, sortedDecimals] =
      assetHelpers.sortTokens(
        pool.tokens.map((token) => token.address),
        pool.tokens.map((token) => token.balance),
        pool.tokens.map((token) => token.decimals)
      ) as [string[], string[], string[]];
    return [sortedTokens, sortedBalances, sortedDecimals];
  }

  private parseCalcInputs(
    sortedBalances: string[],
    sortedDecimals: string[],
    bptIn: string,
    totalShares: string
  ): [
    parsedBalances: OldBigNumber[],
    parsedBptIn: OldBigNumber,
    parsedTotalShares: OldBigNumber
  ] {
    const bnum = (val: string | number | OldBigNumber): OldBigNumber => {
      const number = typeof val === 'string' ? val : val ? val.toString() : '0';
      return new OldBigNumber(number);
    };
    const _parsedBalances = sortedBalances.map((balance, i) =>
      bnum(parseUnits(balance, sortedDecimals[i]).toString())
    );
    const _parsedBptIn = bnum(parseUnits(bptIn).toString());
    const _parsedTotalShares = bnum(parseUnits(totalShares).toString());
    return [_parsedBalances, _parsedBptIn, _parsedTotalShares];
  }

  private calcTokensOutGivenExactBptIn(
    pool: SubgraphPoolBase,
    bptIn: string,
    slippage: string
  ): [string[], string[], string] {
    const [sortedTokens, sortedBalances, sortedDecimals] =
      this.sortPoolInfo(pool);

    const [parsedBalances, parsedBptIn, parsedTotalShares] =
      this.parseCalcInputs(
        sortedBalances,
        sortedDecimals,
        bptIn,
        pool.totalShares
      );

    const amountsOut = SDK.WeightedMath._calcTokensOutGivenExactBptIn(
      parsedBalances,
      parsedBptIn,
      parsedTotalShares
    ).map((amount) => amount.toString());
    const minAmountsOut = amountsOut.map((amount, i) => {
      const formattedAmount = formatFixed(amount, sortedDecimals[i]);
      const minFormattedAmount = subSlippage(
        formattedAmount,
        parseInt(sortedDecimals[i]),
        slippage
      );
      return parseFixed(minFormattedAmount, sortedDecimals[i]).toString();
    });

    return [sortedTokens, minAmountsOut, parsedBptIn.toString()];
  }
}
