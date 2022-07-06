import { cloneDeep } from 'lodash';
import { SubgraphPoolBase, WeightedPool } from '@balancer-labs/sor';
import { PriceImpactConcern } from '@/modules/pools/pool-types/concerns/types';
import { parseToBigInt18, formatFromBigInt18 } from '@/lib/utils/math';
import { ONE, BZERO } from '@/lib/utils/solidityMaths';
import { BalancerError, BalancerErrorCode } from '@/balancerErrors';

export class WeightedPoolPriceImpact implements PriceImpactConcern {
  /**
   * Calculates the BPT return amount when investing with no price impact.
   * @param { SubgraphPoolBase } pool Investment pool.
   * @param { string [] } amounts Token amounts being invested. Needs a value for each pool token.
   * @returns { string } BPT amount.
   */
  bptZeroPriceImpact(pool: SubgraphPoolBase, amounts: string[]): string {
    if (amounts.length !== pool.tokensList.length)
      throw new BalancerError(BalancerErrorCode.ARRAY_LENGTH_MISMATCH);

    // upscaling amounts
    const bigIntAmounts = amounts.map((amount) => parseToBigInt18(amount));
    // swapFee, totalShares, totalWeight all scaled up to 18 decimals
    const weightedPool = WeightedPool.fromPool(pool);

    const totalShares = BigInt(weightedPool.totalShares.toString());

    const tokensList = cloneDeep(pool.tokensList);
    let bptZeroPriceImpact = BZERO;
    for (let i = 0; i < tokensList.length; i++) {
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
