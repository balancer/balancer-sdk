import { LiquidityConcern } from '../types';
import { BigNumberish } from '@ethersproject/bignumber';

export class StablePhantomPoolLiquidity implements LiquidityConcern {
  calcTotal(
    tokenBalances: BigNumberish[],
    tokenDecimals: number[],
    tokenPriceRates: BigNumberish[],
    tokenPrices: (number | null)[]
  ): string {
    // TODO implementation
    console.log(tokenBalances, tokenDecimals, tokenPriceRates, tokenPrices);
    throw new Error('To be implemented');
    return '1000';
  }
}
