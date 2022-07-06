import { cloneDeep } from 'lodash';
import { SubgraphPoolBase, MetaStablePool } from '@balancer-labs/sor';
import { PriceImpactConcern } from '@/modules/pools/pool-types/concerns/types';
import { parseToBigInt18, formatFromBigInt18 } from '@/lib/utils/math';
import { bptSpotPrice } from '@/modules/pools/pool-types/concerns/stable/priceImpact.concern';
import { ONE, BZERO, SolidityMaths } from '@/lib/utils/solidityMaths';
import { BalancerError, BalancerErrorCode } from '@/balancerErrors';

export class MetaStablePoolPriceImpact implements PriceImpactConcern {
  /**
   * Calculates the BPT return amount when investing with no price impact.
   * @param { SubgraphPoolBase } pool Investment pool.
   * @param { string [] } amounts Token amounts being invested. Needs a value for each pool token.
   * @returns { string } BPT amount.
   */
  bptZeroPriceImpact(pool: SubgraphPoolBase, amounts: string[]): string {
    if (amounts.length !== pool.tokensList.length)
      throw new BalancerError(BalancerErrorCode.ARRAY_LENGTH_MISMATCH);

    // upscaling amounts
    const bigIntAmounts = amounts.map((amount) => parseToBigInt18(amount));

    // upscales amp, swapfee, totalshares
    const metaStablePool = MetaStablePool.fromPool(pool);
    const tokensList = cloneDeep(pool.tokensList);
    const totalShares = BigInt(metaStablePool.totalShares.toString());
    const balances = metaStablePool.tokens.map((token) =>
      parseToBigInt18(token.balance)
    );
    const priceRates = metaStablePool.tokens.map((token) =>
      parseToBigInt18(token.priceRate)
    );
    const balancesScaled = balances.map((balance, i) =>
      SolidityMaths.mulDownFixed(balance, priceRates[i])
    );
    let bptZeroPriceImpact = BZERO;
    for (let i = 0; i < tokensList.length; i++) {
      const price =
        (bptSpotPrice(
          metaStablePool.amp.toBigInt(), // this already includes the extra digits from precision
          balancesScaled,
          totalShares,
          i
        ) *
          priceRates[i]) /
        ONE;
      const newTerm = (price * bigIntAmounts[i]) / ONE;
      bptZeroPriceImpact += newTerm;
    }
    return formatFromBigInt18(bptZeroPriceImpact);
  }

  calcPriceImpact(
    tokenAmounts: string[],
    isJoin: boolean,
    isExactOut: boolean,
    pool: SubgraphPoolBase
  ): string {
    const poolClass = MetaStablePool.fromPool(pool);
    return '';
  }
}
