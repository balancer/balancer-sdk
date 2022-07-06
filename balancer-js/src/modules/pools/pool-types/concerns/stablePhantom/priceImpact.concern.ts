import { SubgraphPoolBase, PhantomStablePool, ZERO } from '@balancer-labs/sor';
import { cloneDeep } from 'lodash';
import { PriceImpactConcern } from '@/modules/pools/pool-types/concerns/types';
import { parseToBigInt18 } from '@/lib/utils/math';
import { calcPriceImpact } from '@/modules/pricing/priceImpact';
import {
  ONE,
  BZERO,
  _computeScalingFactor,
  _upscale,
} from '@/lib/utils/solidityMaths';
import { BalancerError, BalancerErrorCode } from '@/balancerErrors';

export class PhantomStablePriceImpact implements PriceImpactConcern {
  /**
   * Calculates the BPT return amount when investing with no price impact.
   * @param { SubgraphPoolBase } pool Investment pool.
   * @param { bigint [] } amounts Token amounts being invested. Needs a value for each pool token that is not a PhantomBpt.
   * @returns { bigint } BPT amount.
   */
  bptZeroPriceImpact(pool: SubgraphPoolBase, tokenAmounts: bigint[]): bigint {
    if (tokenAmounts.length !== pool.tokensList.length - 1)
      throw new BalancerError(BalancerErrorCode.ARRAY_LENGTH_MISMATCH);

    // upscales amp, swapfee, totalshares
    const phantomStablePool = PhantomStablePool.fromPool(pool);
    const tokensList = cloneDeep(pool.tokensList);
    const bptIndex = tokensList.findIndex((token) => token == pool.address);
    tokensList.splice(bptIndex, 1);
    let bptZeroPriceImpact = BZERO;
    for (let i = 0; i < tokensList.length; i++) {
      // Scales and applies rates to balances
      const poolPairData = phantomStablePool.parsePoolPairData(
        tokensList[i],
        pool.address
      );
      const price = parseToBigInt18(
        phantomStablePool
          ._spotPriceAfterSwapExactTokenInForTokenOut(poolPairData, ZERO)
          .toString()
      );
      const scalingFactor = _computeScalingFactor(
        BigInt(pool.tokens[i].decimals)
      );
      const amountUpscaled = _upscale(tokenAmounts[i], scalingFactor);
      bptZeroPriceImpact += (amountUpscaled * price) / ONE;
    }
    return bptZeroPriceImpact;
  }

  calcPriceImpact(
    pool: SubgraphPoolBase,
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
