import { LiquidityConcern } from '../types';
import { PoolToken } from '@/types';
import { parseFixed, formatFixed } from '@/lib/utils/math';
import { Zero } from '@ethersproject/constants';

const SCALING_FACTOR = 18;
const ONE = parseFixed('1', SCALING_FACTOR);

export class LinearPoolLiquidity implements LiquidityConcern {
  calcTotal(tokens: PoolToken[]): string {
    let sumBalance = Zero;
    let sumValue = Zero;

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      // if a token's price is unknown, ignore it
      // it will be computed at the next step
      if (!token.price?.usd) {
        continue;
      }

      const price = parseFixed(token.price.usd.toString(), SCALING_FACTOR);

      const balance = parseFixed(token.balance, SCALING_FACTOR);
      const value = balance.mul(price);

      sumValue = sumValue.add(value);
      sumBalance = sumBalance.add(balance);
    }

    // if at least the partial value of the pool is known
    // then compute the rest of the value of tokens with unknown prices
    if (sumBalance.gt(0)) {
      const avgPrice = sumValue.div(sumBalance);

      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];

        if (token.price?.usd) {
          continue;
        }

        const priceRate = parseFixed(token.priceRate || '1', SCALING_FACTOR);

        // Apply priceRate to scale the balance correctly
        const balance = parseFixed(token.balance, SCALING_FACTOR)
          .mul(priceRate)
          .div(ONE);

        const value = balance.mul(avgPrice);
        sumValue = sumValue.add(value);
        sumBalance = sumBalance.add(balance);
      }
    }

    return formatFixed(sumValue, SCALING_FACTOR * 2);
  }
}
