import { LiquidityConcern } from '../types';
import { TokenBalance } from '@/types';
import { BigNumber, parseFixed, formatFixed } from '@ethersproject/bignumber';

export class StablePoolLiquidity implements LiquidityConcern {
    calcTotal(tokenBalances: TokenBalance[]): string {
        let sumBalance = BigNumber.from(0);
        let sumValue = BigNumber.from(0);

        for (let i = 0; i < tokenBalances.length; i++) {
            const tokenBalance = tokenBalances[i];

            // if a token's price is unknown, ignore it
            // it will be computed at the next step
            if (!tokenBalance.token.price) {
                continue;
            }

            const price = parseFixed(tokenBalance.token.price, 18);
            const balance = parseFixed(tokenBalance.balance, 18);

            const value = balance.mul(price);
            sumValue = sumValue.add(value);
            sumBalance = sumBalance.add(balance);
        }

        // if at least the partial value of the pool is known
        // then compute the rest of the value of tokens with unknown prices
        if (sumBalance.gt(0)) {
            const avgPrice = sumValue.div(sumBalance);

            for (let i = 0; i < tokenBalances.length; i++) {
                const tokenBalance = tokenBalances[i];

                if (tokenBalance.token.price) {
                    continue;
                }

                const balance = parseFixed(tokenBalance.balance, 18);

                const value = balance.mul(avgPrice);
                sumValue = sumValue.add(value);
                sumBalance = sumBalance.add(balance);
            }
        }

        return formatFixed(sumValue, 36).toString();
    }
}
