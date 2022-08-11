import { PriceImpactConcern } from '@/modules/pools/pool-types/concerns/types';
import {
  ONE,
  BZERO,
  _computeScalingFactor,
  _upscale,
} from '@/lib/utils/solidityMaths';
import { calcPriceImpact } from '@/modules/pricing/priceImpact';
import { BalancerError, BalancerErrorCode } from '@/balancerErrors';
import { Pool } from '@/types';
import { bptSpotPrice } from '@/lib/utils/stableMathHelpers';
import { parsePoolInfo } from '@/lib/utils';

export class StablePoolPriceImpact implements PriceImpactConcern {
  /**
   * Calculates the BPT return amount when investing with no price impact.
   * @param { Pool } pool Investment pool.
   * @param { bigint [] } amounts Token amounts being invested. Needs a value for each pool token.
   * @returns { bigint } BPT amount.
   */
  bptZeroPriceImpact(pool: Pool, tokenAmounts: bigint[]): bigint {
    if (tokenAmounts.length !== pool.tokensList.length)
      throw new BalancerError(BalancerErrorCode.INPUT_LENGTH_MISMATCH);

    // upscales amp, swapfee, totalshares
    const { parsedBalances, parsedDecimals, parsedAmp, parsedTotalShares } =
      parsePoolInfo(pool);
    const balances: bigint[] = [];
    for (let i = 0; i < parsedBalances.length; i++) {
      const decimals = parsedDecimals[i];
      if (!decimals)
        throw new BalancerError(BalancerErrorCode.MISSING_DECIMALS);
      else {
        const scalingFactor = _computeScalingFactor(BigInt(decimals));
        balances.push(_upscale(BigInt(parsedBalances[i]), scalingFactor));
      }
    }
    const totalShares = BigInt(parsedTotalShares);

    let bptZeroPriceImpact = BZERO;
    for (let i = 0; i < balances.length; i++) {
      const price = bptSpotPrice(
        BigInt(parsedAmp as string), // this already includes the extra digits from precision
        balances,
        totalShares,
        i
      );
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
    bptAmount: string
  ): string {
    const bptZeroPriceImpact = this.bptZeroPriceImpact(
      pool,
      tokenAmounts.map((a) => BigInt(a))
    );
    return calcPriceImpact(BigInt(bptAmount), bptZeroPriceImpact).toString();
  }
}
