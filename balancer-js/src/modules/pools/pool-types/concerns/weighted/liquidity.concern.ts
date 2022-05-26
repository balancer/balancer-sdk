import { LiquidityConcern } from '../types';
import { TokenBalance } from '@/types';
import { BigNumber, parseFixed, formatFixed } from '@ethersproject/bignumber';
import { Zero } from '@ethersproject/constants';

export class WeightedPoolLiquidity implements LiquidityConcern {
    calcTotal(tokenBalances: TokenBalance[]): string {
        let sumWeight = Zero;
        let sumValue = Zero;

        for (let i = 0; i < tokenBalances.length; i++) {
            const tokenBalance = tokenBalances[i];
            if (!tokenBalance.token.price?.inUSD) {
                continue;
            }
            const price = parseFixed(tokenBalance.token.price.inUSD, 18);
            const balance = parseFixed(tokenBalance.balance, 18);

            const value = balance.mul(price);
            sumValue = sumValue.add(value);
            sumWeight = sumWeight.add(tokenBalance.weight);
        }

        // Scale the known prices of x% of the pool to get value of 100% of the pool.
        const totalWeight = tokenBalances.reduce(
            (total: BigNumber, tokenBalance) => total.add(tokenBalance.weight),
            Zero
        );
        if (sumWeight.gt(0)) {
            const liquidity = sumValue.mul(totalWeight).div(sumWeight);
            return formatFixed(liquidity, 36);
        }

        return '0';
    }
}
