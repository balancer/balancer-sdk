import { BigNumberish } from '@ethersproject/bignumber';

export interface LiquidityConcern {
    calcTotal: (
        tokenBalances: BigNumberish[],
        tokenDecimals: number[],
        tokenPriceRates: BigNumberish[],
        tokenPrices: (number | null)[]
    ) => string;
}
