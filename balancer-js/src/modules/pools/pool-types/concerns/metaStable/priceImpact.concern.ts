import { PriceImpactConcern } from '@/modules/pools/pool-types/concerns/types';
import { calcPriceImpact } from '@/modules/pricing/priceImpact';
import {
  ONE,
  BZERO,
  SolidityMaths,
  _upscale,
  _computeScalingFactor,
} from '@/lib/utils/solidityMaths';
import { BalancerError, BalancerErrorCode } from '@/balancerErrors';
import { Pool } from '@/types';
import { parsePoolInfo } from '@/lib/utils';
import { bptSpotPrice } from '@/lib/utils/stableMathHelpers';

export class MetaStablePoolPriceImpact implements PriceImpactConcern {
  /**
   * Calculates the BPT return amount when investing with no price impact.
   * @param { Pool } pool Investment pool.
   * @param { string [] } amounts Token amounts being invested. Needs a value for each pool token.
   * @returns { string } BPT amount.
   */
  bptZeroPriceImpact(pool: Pool, tokenAmounts: bigint[]): bigint {
    if (tokenAmounts.length !== pool.tokensList.length)
      throw new BalancerError(BalancerErrorCode.INPUT_LENGTH_MISMATCH);

    const { parsedPriceRates, parsedAmp, parsedTotalShares, upScaledBalances } =
      parsePoolInfo(pool);
    const totalShares = BigInt(parsedTotalShares);
    const priceRates = parsedPriceRates.map((rate) => {
      if (!rate) throw new BalancerError(BalancerErrorCode.MISSING_PRICE_RATE);
      return BigInt(rate);
    });
    if (!parsedAmp)
      throw new BalancerError(BalancerErrorCode.MISSING_PRICE_RATE);

    let bptZeroPriceImpact = BZERO;
    for (let i = 0; i < upScaledBalances.length; i++) {
      const price =
        (bptSpotPrice(
          BigInt(parsedAmp as string), // this already includes the extra digits from precision
          upScaledBalances.map(BigInt),
          totalShares,
          i
        ) *
          priceRates[i]) /
        ONE;
      const scalingFactor = _computeScalingFactor(
        BigInt(pool.tokens[i].decimals as number)
      );
      const amountUpscaled = _upscale(tokenAmounts[i], scalingFactor);
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
      tokenAmounts.map((a) => BigInt(a))
    );
    return calcPriceImpact(
      BigInt(bptAmount),
      bptZeroPriceImpact,
      isJoin
    ).toString();
  }
}
