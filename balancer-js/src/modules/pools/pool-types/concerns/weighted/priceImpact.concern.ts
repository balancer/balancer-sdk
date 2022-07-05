import { PriceImpactConcern } from '../types';
import { SubgraphPoolBase, WeightedPool } from '@balancer-labs/sor';
import { cloneDeep } from 'lodash';
import { parseToBigInt18, formatFromBigInt18 } from '@/lib/utils/math';

const ONE = BigInt('1000000000000000000');

export class WeightedPoolPriceImpact implements PriceImpactConcern {
  bptZeroPriceImpact(pool: SubgraphPoolBase, amounts: string[]): string {
    const bigIntAmounts = amounts.map((amount) =>
      BigInt(parseToBigInt18(amount))
    );
    const weightedPool = WeightedPool.fromPool(pool);
    const tokensList = cloneDeep(pool.tokensList);
    const n = tokensList.length;
    // Should the following check throw an error?
    if (amounts.length !== tokensList.length) return 'array length mismatch';
    const totalShares = BigInt(weightedPool.totalShares.toString());
    let bptZeroPriceImpact = BigInt(0);
    for (let i = 0; i < n; i++) {
      const weight =
        (parseToBigInt18(weightedPool.tokens[i].weight) *
          weightedPool.totalWeight.toBigInt()) /
        ONE;
      const balance = parseToBigInt18(weightedPool.tokens[i].balance);
      const price = (weight * totalShares) / balance;
      const newTerm = (price * bigIntAmounts[i]) / ONE;
      bptZeroPriceImpact += newTerm;
    }
    return formatFromBigInt18(bptZeroPriceImpact);
  }

  calcPriceImpact(
    tokenAmounts: string[],
    isJoin: boolean,
    isExactOut: boolean,
    pool: SubgraphPoolBase
  ): string {
    const bptZeroPriceImpact = this.bptZeroPriceImpact(pool, tokenAmounts);
    // Compute BPT amount
    // answer = bptAmount / bptZeroPriceImpact - 1
    return '';
  }
}
