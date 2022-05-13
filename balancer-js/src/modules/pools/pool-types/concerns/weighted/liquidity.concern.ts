import { LiquidityConcern } from '../types';
import { TokenBalance } from '@/types';
import { BigNumber, parseFixed, formatFixed } from '@ethersproject/bignumber';

export class WeightedPoolLiquidity implements LiquidityConcern {
    calcTotal(tokenBalances: TokenBalance[]): string {
        let sumValue = BigNumber.from(0);

        for (let i = 0; i < tokenBalances.length; i++) {
            const tokenBalance = tokenBalances[i];
            const price = parseFixed(tokenBalance.token.price, 18);
            const balance = parseFixed(tokenBalance.balance, 18);

            const value = balance.mul(price);
            sumValue = sumValue.add(value);
        }

        return formatFixed(sumValue, 36).toString();
    }
}
