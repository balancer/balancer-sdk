import { SubgraphPoolBase, PhantomStablePool, ZERO } from '@balancer-labs/sor';
import { cloneDeep } from 'lodash';
import { PriceImpactConcern } from '@/modules/pools/pool-types/concerns/types';
import { parseToBigInt18, formatFromBigInt18 } from '@/lib/utils/math';
import { ONE, BZERO } from '@/lib/utils/solidityMaths';
import { BalancerError, BalancerErrorCode } from '@/balancerErrors';

export class PhantomStablePriceImpact implements PriceImpactConcern {
  /**
   * Calculates the BPT return amount when investing with no price impact.
   * @param { SubgraphPoolBase } pool Investment pool.
   * @param { string [] } amounts Token amounts being invested. Needs a value for each pool token that is not a PhantomBpt.
   * @returns { string } BPT amount.
   */
  bptZeroPriceImpact(pool: SubgraphPoolBase, amounts: string[]): string {
    if (amounts.length !== pool.tokensList.length - 1)
      throw new BalancerError(BalancerErrorCode.ARRAY_LENGTH_MISMATCH);

    // upscaling amounts
    const bigIntAmounts = amounts.map((amount) => parseToBigInt18(amount));

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
      bptZeroPriceImpact += (bigIntAmounts[i] * price) / ONE;
    }
    return formatFromBigInt18(bptZeroPriceImpact);
  }

  calcPriceImpact(
    tokenAmounts: string[],
    isJoin: boolean,
    isExactOut: boolean,
    pool: SubgraphPoolBase
  ): string {
    const bptZeroPriceImpact = this.bptZeroPriceImpact(pool, tokenAmounts);
    // Compute BPT amount
    // answer = bptAmount / bptZeroPriceImpact - 1
    return '';
  }
}
