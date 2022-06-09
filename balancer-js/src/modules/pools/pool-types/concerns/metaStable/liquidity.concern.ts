import { LiquidityConcern } from '../types';
import { TokenBalance } from '@/types';
import { parseFixed, formatFixed } from '@ethersproject/bignumber';
import { Zero } from '@ethersproject/constants';

const SCALING_FACTOR = 18;

export class MetaStablePoolLiquidity implements LiquidityConcern {
  calcTotal(tokenBalances: TokenBalance[]): string {
    let sumBalance = Zero;
    let sumValue = Zero;

    for (let i = 0; i < tokenBalances.length; i++) {
      const tokenBalance = tokenBalances[i];

      // if a token's price is unknown, ignore it
      // it will be computed at the next step
      if (!tokenBalance.token.price?.usd) {
        continue;
      }

      const price = parseFixed(tokenBalance.token.price.usd, SCALING_FACTOR);

      const balance = parseFixed(tokenBalance.balance, SCALING_FACTOR);

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

        if (tokenBalance.token.price?.usd) {
          continue;
        }

        const balance = parseFixed(tokenBalance.balance, SCALING_FACTOR);

        const value = balance.mul(avgPrice);
        sumValue = sumValue.add(value);
        sumBalance = sumBalance.add(balance);
      }
    }

    return formatFixed(sumValue, SCALING_FACTOR * 2).toString();
  }
}
