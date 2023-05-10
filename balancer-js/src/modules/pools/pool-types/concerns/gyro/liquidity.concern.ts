import { LiquidityConcern } from '../types';
import { PoolToken } from '@/types';
import { formatFixed } from '@ethersproject/bignumber';
import { parseFixed } from '@/lib/utils/math';
import { SolidityMaths } from '@/lib/utils/solidityMaths';

const SCALING_FACTOR = 18;

export class GyroLiquidityConcern implements LiquidityConcern {
  calcTotal(tokens: PoolToken[]): string {
    let sumBalance = BigInt(0);
    let sumValue = BigInt(0);

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      // if a token's price is unknown, ignore it
      // it will be computed at the next step
      if (!token.price?.usd) {
        continue;
      }

      const price = parseFixed(
        token.price.usd.toString(),
        SCALING_FACTOR
      ).toBigInt();
      const balance = parseFixed(token.balance, SCALING_FACTOR).toBigInt();

      const value = SolidityMaths.mulDownFixed(balance, price);
      sumValue = SolidityMaths.add(sumValue, value);
      sumBalance = SolidityMaths.add(sumBalance, balance);
    }
    // if at least the partial value of the pool is known
    // then compute the rest of the value of tokens with unknown prices
    if (sumBalance > BigInt(0)) {
      const avgPrice = SolidityMaths.divDownFixed(sumValue, sumBalance);

      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];

        if (token.price?.usd) {
          continue;
        }

        const balance = parseFixed(token.balance, SCALING_FACTOR).toBigInt();

        const value = SolidityMaths.mulDownFixed(balance, avgPrice);
        sumValue = SolidityMaths.add(sumValue, value);
        sumBalance = SolidityMaths.add(sumBalance, balance);
      }
    }
    return formatFixed(sumValue.toString(), SCALING_FACTOR).toString();
  }
}
