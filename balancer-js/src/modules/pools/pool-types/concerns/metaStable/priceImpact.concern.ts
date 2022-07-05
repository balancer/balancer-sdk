import { PriceImpactConcern } from '../types';
import { SubgraphPoolBase, MetaStablePool } from '@balancer-labs/sor';
import { parseToBigInt18, formatFromBigInt18 } from '@/lib/utils/math';
import { cloneDeep } from 'lodash';
import { bptSpotPrice } from '../stable/priceImpact.concern';
import { SolidityMaths } from '@/lib/utils/solidityMaths';

const ONE = BigInt('1000000000000000000');

export class MetaStablePoolPriceImpact implements PriceImpactConcern {
  bptZeroPriceImpact(pool: SubgraphPoolBase, amounts: string[]): string {
    const bigIntAmounts = amounts.map((amount) => parseToBigInt18(amount));
    const metaStablePool = MetaStablePool.fromPool(pool);
    const tokensList = cloneDeep(pool.tokensList);
    const n = tokensList.length;
    // Should the following check throw an error?
    if (amounts.length !== tokensList.length) return 'array length mismatch';
    let bptZeroPriceImpact = BigInt(0);
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

    for (let i = 0; i < n; i++) {
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
