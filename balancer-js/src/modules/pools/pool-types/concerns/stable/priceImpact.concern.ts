import { PriceImpactConcern } from '@/modules/pools/pool-types/concerns/types';
import { ONE, BZERO, _upscale } from '@/lib/utils/solidityMaths';
import { calcPriceImpact } from '@/modules/pricing/priceImpact';
import { BalancerError, BalancerErrorCode } from '@/balancerErrors';
import { Pool } from '@/types';
import { bptSpotPrice } from '@/lib/utils/stableMathHelpers';
import { parsePoolInfo } from '@/lib/utils';

// Note: this concern is used by Stable, MetaStable and StablePhantom pools
export class StablePoolPriceImpact implements PriceImpactConcern {
  bptZeroPriceImpact(pool: Pool, tokenAmounts: bigint[]): bigint {
    // upscales amp, swapfee, totalshares
    const {
      ampWithPrecision,
      scalingFactorsWithoutBpt,
      totalSharesEvm,
      upScaledBalancesWithoutBpt,
    } = parsePoolInfo(pool);

    // Check against array without BPT because concern is being reused by stablePhantom pools
    // Stable and MetaStable pools don't have BPT in the token list, so array without BPT is the same as the original array
    if (tokenAmounts.length !== upScaledBalancesWithoutBpt.length)
      throw new BalancerError(BalancerErrorCode.INPUT_LENGTH_MISMATCH);

    let bptZeroPriceImpact = BZERO;
    for (let i = 0; i < upScaledBalancesWithoutBpt.length; i++) {
      const price = bptSpotPrice(
        ampWithPrecision,
        upScaledBalancesWithoutBpt,
        totalSharesEvm,
        i
      );
      const amountUpscaled = _upscale(
        tokenAmounts[i],
        scalingFactorsWithoutBpt[i]
      );
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
