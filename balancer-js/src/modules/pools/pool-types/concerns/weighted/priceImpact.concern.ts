import { PriceImpactConcern } from '../types';
import { SubgraphPoolBase, WeightedPool } from '@balancer-labs/sor';
import { cloneDeep } from 'lodash';
import { realNumberToEvm, evmToRealNumber } from '@/utils/conversions';

const ONE = BigInt('1000000000000000000');

export class WeightedPoolPriceImpact implements PriceImpactConcern {
  bptZeroPriceImpact(pool: SubgraphPoolBase, amounts: string[]): string {
    const bigIntAmounts = amounts.map((amount) =>
      BigInt(realNumberToEvm(amount))
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
        (realNumberToEvm(weightedPool.tokens[i].weight) *
          weightedPool.totalWeight.toBigInt()) /
        ONE;
      const balance = realNumberToEvm(weightedPool.tokens[i].balance);
      const price = (weight * totalShares) / balance;
      const newTerm = (price * bigIntAmounts[i]) / ONE;
      bptZeroPriceImpact += newTerm;
    }
    return evmToRealNumber(bptZeroPriceImpact);
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
