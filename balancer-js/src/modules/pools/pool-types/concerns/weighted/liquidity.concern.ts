import { LiquidityConcern } from '../types';
import { PoolToken } from '@/types';
import { BigNumber } from '@ethersproject/bignumber';
import { parseFixed, formatFixed } from '@/lib/utils/math';

const SCALING_FACTOR = 18;

export class WeightedPoolLiquidity implements LiquidityConcern {
  calcTotal(tokens: PoolToken[]): string {
    let sumWeight = BigNumber.from(0);
    let sumValue = BigNumber.from(0);

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (!token.price?.usd) {
        continue;
      }

      let price: BigNumber;
      if (parseFloat(token.price.usd) < 1) {
        price = parseFixed(parseFloat(token.price.usd).toFixed(10), 10).mul(
          1e8
        );
      } else {
        price = parseFixed(token.price.usd, SCALING_FACTOR);
      }
      const balance = parseFixed(token.balance, SCALING_FACTOR);
      const weight = parseFixed(token.weight || '0', SCALING_FACTOR);

      const value = balance.mul(price);
      sumValue = sumValue.add(value);
      sumWeight = sumWeight.add(weight);
    }

    // Scale the known prices of x% of the pool to get value of 100% of the pool.
    const totalWeight = tokens.reduce(
      (total: BigNumber, token) =>
        total.add(parseFixed(token.weight || '0', SCALING_FACTOR)),
      BigNumber.from(0)
    );
    if (sumWeight.gt(0)) {
      const liquidity = sumValue.mul(totalWeight).div(sumWeight);
      return formatFixed(liquidity, SCALING_FACTOR * 2);
    }

    return '0';
  }
}
