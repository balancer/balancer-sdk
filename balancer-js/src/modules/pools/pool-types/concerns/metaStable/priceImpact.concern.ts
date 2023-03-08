import { PriceImpactConcern } from '@/modules/pools/pool-types/concerns/types';
import { calcPriceImpact } from '@/modules/pricing/priceImpact';
import { ONE, BZERO, _upscale } from '@/lib/utils/solidityMaths';
import { BalancerError, BalancerErrorCode } from '@/balancerErrors';
import { Pool } from '@/types';
import { parsePoolInfo } from '@/lib/utils';
import { bptSpotPrice } from '@/lib/utils/stableMathHelpers';

export class MetaStablePoolPriceImpact implements PriceImpactConcern {
  /**
   * Calculates the BPT return amount when investing with no price impact.
   * @param { Pool } pool Investment pool.
   * @param { string [] } tokenAmounts Token amounts being invested. Needs a value for each pool token.
   * @returns { string } BPT amount.
   */
  bptZeroPriceImpact(pool: Pool, tokenAmounts: bigint[]): bigint {
    if (tokenAmounts.length !== pool.tokensList.length)
      throw new BalancerError(BalancerErrorCode.INPUT_LENGTH_MISMATCH);

    const {
      priceRates,
      ampWithPrecision,
      scalingFactorsRaw,
      totalSharesEvm,
      upScaledBalances,
    } = parsePoolInfo(pool);

    let bptZeroPriceImpact = BZERO;
    for (let i = 0; i < upScaledBalances.length; i++) {
      const price = bptSpotPrice(
        ampWithPrecision,
        upScaledBalances,
        totalSharesEvm,
        i
      );
      // TODO: check if it makes sense to multiply by priceRates since upscaledBalances already have the priceRate applied
      // if yes, we should likely be able to remove this concern and reuse from stable pool
      const priceWithRate = (price * priceRates[i]) / ONE;
      const amountUpscaled = _upscale(tokenAmounts[i], scalingFactorsRaw[i]);
      const newTerm = (priceWithRate * amountUpscaled) / ONE;
      bptZeroPriceImpact += newTerm;
    }
    return bptZeroPriceImpact;
  }

  calcPriceImpact(
    pool: Pool,
    tokenAmounts: string[],
    bptAmount: string,
    isJoin: boolean
  ): string {
    const bptZeroPriceImpact = this.bptZeroPriceImpact(
      pool,
      tokenAmounts.map(BigInt)
    );
    return calcPriceImpact(
      BigInt(bptAmount),
      bptZeroPriceImpact,
      isJoin
    ).toString();
  }
}
