import { LiquidityConcern } from '../types';
import { PoolToken } from '@/types';
import { BigNumber as OldBigNumber } from 'bignumber.js';

export class WeightedPoolLiquidity implements LiquidityConcern {
  calcTotal(tokens: PoolToken[]): string {
    let sumWeight = new OldBigNumber(0);
    let sumValue = new OldBigNumber(0);

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (!token.price?.usd) {
        continue;
      }
      const price = new OldBigNumber(token.price.usd);
      const balance = new OldBigNumber(token.balance);

      const value = balance.times(price);
      sumValue = sumValue.plus(value);
      sumWeight = sumWeight.plus(token.weight || '0');
    }

    // Scale the known prices of x% of the pool to get value of 100% of the pool.
    const totalWeight = tokens.reduce(
      (total: OldBigNumber, token) => total.plus(token.weight || '0'),
      new OldBigNumber(0)
    );
    if (sumWeight.gt(0)) {
      const liquidity = sumValue.times(totalWeight).div(sumWeight);
      return liquidity.toString();
    }

    return '0';
  }
}
