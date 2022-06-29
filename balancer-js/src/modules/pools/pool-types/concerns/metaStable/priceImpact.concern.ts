import { PriceImpactConcern } from '../types';
import { SubgraphPoolBase, MetaStablePool } from '@balancer-labs/sor';
import { realNumberToEvm, evmToRealNumber } from '@/utils/conversions';
import { cloneDeep } from 'lodash';
import { bptSpotPrice } from '../stable/priceImpact.concern';
import { MathSol } from '@/utils/basicOperations';

const ONE = BigInt('1000000000000000000');

export class MetaStablePoolPriceImpact implements PriceImpactConcern {
  bptZeroPriceImpact(pool: SubgraphPoolBase, amounts: string[]): string {
    const bigIntAmounts = amounts.map((amount) => realNumberToEvm(amount));
    const metaStablePool = MetaStablePool.fromPool(pool);
    const tokensList = cloneDeep(pool.tokensList);
    const n = tokensList.length;
    // Should the following check throw an error?
    if (amounts.length !== tokensList.length) return 'array length mismatch';
    let bptZeroPriceImpact = BigInt(0);
    const totalShares = BigInt(metaStablePool.totalShares.toString());
    const balances = metaStablePool.tokens.map((token) =>
      realNumberToEvm(token.balance)
    );
    const priceRates = metaStablePool.tokens.map((token) =>
      realNumberToEvm(token.priceRate)
    );
    const balancesScaled = balances.map((balance, i) =>
      MathSol.mulDownFixed(balance, priceRates[i])
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
    return evmToRealNumber(bptZeroPriceImpact);
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
