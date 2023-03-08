import { PriceImpactConcern } from '@/modules/pools/pool-types/concerns/types';
import { ONE, BZERO, _upscale } from '@/lib/utils/solidityMaths';
import { calcPriceImpact } from '@/modules/pricing/priceImpact';
import { BalancerError, BalancerErrorCode } from '@/balancerErrors';
import { Pool } from '@/types';
import { bptSpotPrice } from '@/lib/utils/stableMathHelpers';
import { parsePoolInfo } from '@/lib/utils';

export class StablePoolPriceImpact implements PriceImpactConcern {
  /**
   * Calculates the BPT return amount when investing with no price impact.
   * @param { Pool } pool Investment pool.
   * @param { bigint [] } tokenAmounts Token amounts being invested. Needs a value for each pool token.
   * @returns { bigint } BPT amount.
   */
  bptZeroPriceImpact(pool: Pool, tokenAmounts: bigint[]): bigint {
    if (tokenAmounts.length !== pool.tokensList.length)
      throw new BalancerError(BalancerErrorCode.INPUT_LENGTH_MISMATCH);

    // upscales amp, swapfee, totalshares
    const {
      ampWithPrecision,
      totalSharesEvm,
      scalingFactorsRaw,
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
      const amountUpscaled = _upscale(tokenAmounts[i], scalingFactorsRaw[i]);
      const newTerm = (price * amountUpscaled) / ONE;
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
