import { LiquidityConcern } from '../types';
import { BigNumberish } from '@ethersproject/bignumber';

export class WeightedPoolLiquidity implements LiquidityConcern {
  calcTotal(
    tokenBalances: BigNumberish[],
    tokenDecimals: number[],
    tokenPriceRates: BigNumberish[],
    tokenPrices: (number | null)[],
    someOtherInput: number
  ): string {
    // TODO implementation
    console.log(
      tokenBalances,
      tokenDecimals,
      tokenPriceRates,
      tokenPrices,
      someOtherInput
    );
    throw new Error('To be implemented');
    return '100';
  }
}
