import { BigNumberish } from '@ethersproject/bignumber';

export interface PoolTypeCalcs {
    totalLiquidity: (
        tokenBalances: BigNumberish[],
        tokenDecimals: number[],
        tokenPriceRates: BigNumberish[],
        tokenPrices: (number | null)[]
    ) => string;
}
