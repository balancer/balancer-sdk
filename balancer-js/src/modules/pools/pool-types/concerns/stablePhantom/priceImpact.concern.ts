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
   * @param { bigint [] } amounts Token amounts being invested. Needs a value for each pool token that is not a PhantomBpt.
   * @returns { bigint } BPT amount.
   */
  bptZeroPriceImpact(pool: Pool, tokenAmounts: bigint[]): bigint {
    if (tokenAmounts.length !== pool.tokensList.length - 1)
      throw new BalancerError(BalancerErrorCode.INPUT_LENGTH_MISMATCH);

    const tokensList = cloneDeep(pool.tokensList);
    const bptIndex = tokensList.findIndex((token) => token == pool.address);

    // upscales amp, swapfee, totalshares
    const {
      parsedBalances,
      parsedDecimals,
      parsedPriceRates,
      parsedAmp,
      parsedTotalShares,
    } = parsePoolInfo(pool);
    const decimals = parsedDecimals.map((decimals) => {
      if (!decimals)
        throw new BalancerError(BalancerErrorCode.MISSING_DECIMALS);
      return BigInt(decimals);
    });
    const priceRates = parsedPriceRates.map((rate) => {
      if (!rate) throw new BalancerError(BalancerErrorCode.MISSING_PRICE_RATE);
      return BigInt(rate);
    });
    if (!parsedAmp)
      throw new BalancerError(BalancerErrorCode.MISSING_PRICE_RATE);
    const totalShares = BigInt(parsedTotalShares);
    tokensList.splice(bptIndex, 1);

    const scalingFactors = decimals.map((decimals) =>
      _computeScalingFactor(BigInt(decimals))
    );
    const balances = parsedBalances.map((balance, i) =>
      _upscale(BigInt(balance), scalingFactors[i])
    );
    if (tokenAmounts.length !== tokensList.length)
      throw new BalancerError(BalancerErrorCode.INPUT_LENGTH_MISMATCH);
    balances.splice(bptIndex, 1);
    const balancesScaled = balances.map((balance, i) =>
      SolidityMaths.mulDownFixed(balance, priceRates[i])
    );
    let bptZeroPriceImpact = BZERO;
    for (let i = 0; i < tokensList.length; i++) {
      const price =
        (bptSpotPrice(
          BigInt(parsedAmp), // this already includes the extra digits from precision
          balancesScaled,
          totalShares,
          i
        ) *
          priceRates[i]) /
        ONE;
      const scalingFactor = _computeScalingFactor(BigInt(decimals[i]));
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
