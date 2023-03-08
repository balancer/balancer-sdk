import { PriceImpactConcern } from '@/modules/pools/pool-types/concerns/types';
import { calcPriceImpact } from '@/modules/pricing/priceImpact';
import { ONE, BZERO, _upscale } from '@/lib/utils/solidityMaths';
import { BalancerError, BalancerErrorCode } from '@/balancerErrors';
import { bptSpotPrice } from '@/lib/utils/stableMathHelpers';
import { Pool } from '@/types';
import { parsePoolInfo } from '@/lib/utils';

export class StablePhantomPriceImpact implements PriceImpactConcern {
  /**
   * Calculates the BPT return amount when investing with no price impact.
   * @param { Pool } pool Investment pool.
   * @param { bigint [] } tokenAmounts Token amounts being invested. Needs a value for each pool token that is not a PhantomBpt.
   * @returns { bigint } BPT amount.
   */
  bptZeroPriceImpact(pool: Pool, tokenAmounts: bigint[]): bigint {
    // upscales amp, swapfee, totalshares
    const {
      ampWithPrecision,
      poolTokensWithoutBpt,
      priceRatesWithoutBpt,
      scalingFactorsWithoutBpt,
      totalSharesEvm,
      upScaledBalancesWithoutBpt,
    } = parsePoolInfo(pool);

    if (tokenAmounts.length !== poolTokensWithoutBpt.length)
      throw new BalancerError(BalancerErrorCode.INPUT_LENGTH_MISMATCH);

    let bptZeroPriceImpact = BZERO;
    for (let i = 0; i < tokenAmounts.length; i++) {
      const price = bptSpotPrice(
        ampWithPrecision,
        upScaledBalancesWithoutBpt,
        totalSharesEvm,
        i
      );
      // TODO: check if it makes sense to multiply by priceRates since upscaledBalances already have the priceRate applied
      const priceWithRate = (price * priceRatesWithoutBpt[i]) / ONE;
      const amountUpscaled = _upscale(
        tokenAmounts[i],
        scalingFactorsWithoutBpt[i]
      );
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
