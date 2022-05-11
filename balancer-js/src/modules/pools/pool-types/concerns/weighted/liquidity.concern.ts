import { LiquidityConcern } from '../types';
import { BigNumberish } from '@ethersproject/bignumber';

export interface TokenBalance {
    balance: BigNumberish;
    decimals: number;
    priceRate: BigNumberish;
    price: BigNumberish;
}

export class WeightedPoolLiquidity implements LiquidityConcern {
    calcTotal(
        tokenBalances: TokenBalance[],
    ): string {
        // TODO implementation
        console.log(
            tokenBalances,
        );
        throw new Error('To be implemented');
        return '100';
    }
}
