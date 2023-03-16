import { PriceImpactConcern } from '@/modules/pools/pool-types/concerns/types';
import { calcPriceImpact } from '@/modules/pricing/priceImpact';
import { ONE, BZERO, _upscale } from '@/lib/utils/solidityMaths';
import { BalancerError, BalancerErrorCode } from '@/balancerErrors';
import { Pool } from '@/types';
import { parsePoolInfo } from '@/lib/utils';

export class WeightedPoolPriceImpact implements PriceImpactConcern {
  bptZeroPriceImpact(pool: Pool, tokenAmounts: bigint[]): bigint {
    if (tokenAmounts.length !== pool.tokensList.length)
      throw new BalancerError(BalancerErrorCode.INPUT_LENGTH_MISMATCH);

    // totalShares, balances and weights all scaled up to 18 decimals
    const { scalingFactorsRaw, totalSharesEvm, upScaledBalances, weights } =
      parsePoolInfo(pool);

    let bptZeroPriceImpact = BZERO;
    for (let i = 0; i < tokenAmounts.length; i++) {
      const price = (weights[i] * totalSharesEvm) / upScaledBalances[i];
      const amountUpscaled = _upscale(tokenAmounts[i], scalingFactorsRaw[i]);
      const newTerm = (price * amountUpscaled) / ONE;
      bptZeroPriceImpact += newTerm;
    }
    return bptZeroPriceImpact;
  }

  calcPriceImpact(
    pool: Pool,
    tokenAmounts: bigint[],
    bptAmount: bigint,
    isJoin: boolean
  ): string {
    const bptZeroPriceImpact = this.bptZeroPriceImpact(pool, tokenAmounts);
    return calcPriceImpact(bptAmount, bptZeroPriceImpact, isJoin).toString();
  }
}
