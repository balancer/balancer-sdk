import { LiquidityConcern } from '../types';
import { BigNumber, parseFixed, formatFixed } from '@ethersproject/bignumber';

export interface TokenBalance {
    balance: string;
    decimals: number;
    priceRate: string;
    price: string;
}

export class WeightedPoolLiquidity implements LiquidityConcern {
    calcTotal(tokenBalances: TokenBalance[]): string {
        let sumValue = BigNumber.from(0);

        for (let i = 0; i < tokenBalances.length; i++) {
            const token = tokenBalances[i];
            const price = parseFixed(token.price, 18);
            const balance = parseFixed(token.balance, 18);

            const value = balance.mul(price);
            sumValue = sumValue.add(value);
        }

        return formatFixed(sumValue, 36).toString();
    }
}
