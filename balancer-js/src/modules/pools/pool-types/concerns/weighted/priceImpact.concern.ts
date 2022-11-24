import { cloneDeep } from 'lodash';
import { PriceImpactConcern } from '@/modules/pools/pool-types/concerns/types';
import { calcPriceImpact } from '@/modules/pricing/priceImpact';
import {
  ONE,
  BZERO,
  _computeScalingFactor,
  _upscale,
} from '@/lib/utils/solidityMaths';
import { BalancerError, BalancerErrorCode } from '@/balancerErrors';
import { Pool } from '@/types';
import { parsePoolInfo } from '@/lib/utils';

export class WeightedPoolPriceImpact implements PriceImpactConcern {
  /**
   * Calculates the BPT return amount when investing with no price impact.
   * @param { Pool } pool Investment pool.
   * @param { bigint [] } amounts Token amounts being invested. EVM Scale. Needs a value for each pool token.
   * @returns { bigint } BPT amount.
   */
  bptZeroPriceImpact(pool: Pool, tokenAmounts: bigint[]): bigint {
    if (tokenAmounts.length !== pool.tokensList.length)
      throw new BalancerError(BalancerErrorCode.INPUT_LENGTH_MISMATCH);

    // swapFee, totalShares, totalWeight all scaled up to 18 decimals
    const { parsedBalances, parsedDecimals, parsedTotalShares, parsedWeights } =
      parsePoolInfo(pool);

    const totalShares = BigInt(parsedTotalShares);
    const tokensList = cloneDeep(pool.tokensList);
    let bptZeroPriceImpact = BZERO;
    for (let i = 0; i < tokensList.length; i++) {
      const decimals = parsedDecimals[i];
      let scalingFactor: bigint;
      let balance: bigint;
      if (!decimals)
        throw new BalancerError(BalancerErrorCode.MISSING_DECIMALS);
      else {
        scalingFactor = _computeScalingFactor(BigInt(decimals));
        balance = _upscale(BigInt(parsedBalances[i]), scalingFactor);
      }
      const weightString = parsedWeights[i];
      let weight: bigint;
      if (!weightString)
        throw new BalancerError(BalancerErrorCode.MISSING_WEIGHT);
      else {
        weight = BigInt(weightString);
      }
      const price = (weight * totalShares) / balance;
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
