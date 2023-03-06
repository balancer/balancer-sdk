import { cloneDeep } from 'lodash';
import { PriceImpactConcern } from '@/modules/pools/pool-types/concerns/types';
import { calcPriceImpact } from '@/modules/pricing/priceImpact';
import {
  ONE,
  BZERO,
  _computeScalingFactor,
  _upscale,
  SolidityMaths,
} from '@/lib/utils/solidityMaths';
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
    if (tokenAmounts.length !== pool.tokensList.length - 1)
      throw new BalancerError(BalancerErrorCode.INPUT_LENGTH_MISMATCH);

    const tokensList = cloneDeep(pool.tokensList);
    const bptIndex = tokensList.findIndex((token) => token == pool.address);

    // upscales amp, swapfee, totalshares
    const {
      parsedPriceRates,
      parsedAmp,
      parsedTotalShares,
      scalingFactors,
      upScaledBalancesWithoutBpt,
    } = parsePoolInfo(pool);
    const priceRates = parsedPriceRates.map((rate) => {
      if (!rate) throw new BalancerError(BalancerErrorCode.MISSING_PRICE_RATE);
      return BigInt(rate);
    });
    if (!parsedAmp)
      throw new BalancerError(BalancerErrorCode.MISSING_PRICE_RATE);
    const totalShares = BigInt(parsedTotalShares);
    tokensList.splice(bptIndex, 1);

    if (tokenAmounts.length !== tokensList.length)
      throw new BalancerError(BalancerErrorCode.INPUT_LENGTH_MISMATCH);
    let bptZeroPriceImpact = BZERO;
    for (let i = 0; i < tokensList.length; i++) {
      const price =
        (bptSpotPrice(
          BigInt(parsedAmp), // this already includes the extra digits from precision
          upScaledBalancesWithoutBpt.map(BigInt),
          totalShares,
          i
        ) *
          priceRates[i]) /
        ONE;
      const amountUpscaled = _upscale(tokenAmounts[i], scalingFactors[i]);
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
