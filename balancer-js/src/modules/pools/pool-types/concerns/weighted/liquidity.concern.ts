import { LiquidityConcern } from '../types';
import { PoolToken } from '@/types';
import { BigNumber, formatFixed } from '@ethersproject/bignumber';
import { parseFixed } from '@/lib/utils/math';
import { Zero } from '@ethersproject/constants';

const SCALING_FACTOR = 18;

export class WeightedPoolLiquidity implements LiquidityConcern {
  calcTotal(tokens: PoolToken[]): string {
    let sumWeight = Zero;
    let sumValue = Zero;

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (!token.price?.usd) {
        continue;
      }
      const price = parseFixed(token.price.usd, SCALING_FACTOR);
      const balance = parseFixed(token.balance, SCALING_FACTOR);

      const value = balance.mul(price);
      sumValue = sumValue.add(value);
      sumWeight = sumWeight.add(token.weight || '0');
    }

    // Scale the known prices of x% of the pool to get value of 100% of the pool.
    const totalWeight = tokens.reduce(
      (total: BigNumber, token) => total.add(token.weight || '0'),
      Zero
    );
    if (sumWeight.gt(0)) {
      const liquidity = sumValue.mul(totalWeight).div(sumWeight);
      return formatFixed(liquidity, SCALING_FACTOR * 2);
    }

    return '0';
  }
}
