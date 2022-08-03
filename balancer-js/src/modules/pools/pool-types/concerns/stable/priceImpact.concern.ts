import { cloneDeep } from 'lodash';
import { PriceImpactConcern } from '@/modules/pools/pool-types/concerns/types';
import {
  ONE,
  BZERO,
  _computeScalingFactor,
  _upscale,
} from '@/lib/utils/solidityMaths';
import { calcPriceImpact } from '@/modules/pricing/priceImpact';
import { parseToBigInt18 } from '@/lib/utils/math';
import { BalancerError, BalancerErrorCode } from '@/balancerErrors';
import { Pool } from '@/types';
import { bptSpotPrice } from '@/lib/utils/stableMathHelpers';
import { parsePoolInfo } from '@/lib/utils';
import { StablePool, SubgraphPoolBase } from '@balancer-labs/sor';

export class StablePoolPriceImpact implements PriceImpactConcern {
  /**
   * Calculates the BPT return amount when investing with no price impact.
   * @param { Pool } pool Investment pool.
   * @param { bigint [] } amounts Token amounts being invested. Needs a value for each pool token.
   * @returns { bigint } BPT amount.
   */
  bptZeroPriceImpact(pool: Pool, tokenAmounts: bigint[]): bigint {
    if (tokenAmounts.length !== pool.tokensList.length)
      throw new BalancerError(BalancerErrorCode.ARRAY_LENGTH_MISMATCH);

    // upscales amp, swapfee, totalshares
    const { parsedBalances, parsedAmp, parsedTotalShares } =
      parsePoolInfo(pool);
    const totalShares = BigInt(parsedTotalShares);
    const balances = parsedBalances.map((balance) => BigInt(balance));

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
