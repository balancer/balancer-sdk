import { PriceImpactConcern } from '../types';
import { SubgraphPoolBase, StablePool } from '@balancer-labs/sor';
import { BZERO, SolidityMaths } from '@/lib/utils/solidityMaths';
import { cloneDeep } from 'lodash';
import { parseToBigInt18, formatFromBigInt18 } from '@/lib/utils/math';

const ONE = BigInt('1000000000000000000');

export class StablePriceImpact implements PriceImpactConcern {
  bptZeroPriceImpact(pool: SubgraphPoolBase, amounts: string[]): string {
    const bigIntAmounts = amounts.map((amount) => parseToBigInt18(amount));
    const stablePool = StablePool.fromPool(pool);
    const tokensList = cloneDeep(pool.tokensList);
    const n = tokensList.length;
    // Should the following check throw an error?
    if (amounts.length !== tokensList.length) return 'array length mismatch';
    let bptZeroPriceImpact = BigInt(0);
    const totalShares = BigInt(stablePool.totalShares.toString());
    const balances = stablePool.tokens.map((token) =>
      parseToBigInt18(token.balance)
    );

    for (let i = 0; i < n; i++) {
      const price = bptSpotPrice(
        stablePool.amp.toBigInt(), // this already includes the extra digits from precision
        balances,
        totalShares,
        i
      );
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
    const bptZeroPriceImpact = this.bptZeroPriceImpact(pool, tokenAmounts);
    // Compute BPT amount
    // answer = bptAmount / bptZeroPriceImpact - 1
    return '';
  }
}

const AMP_PRECISION = BigInt(1e3);

export function bptSpotPrice(
  amp: bigint,
  balances: bigint[],
  bptSupply: bigint,
  tokenIndexIn: number
): bigint {
  const totalCoins = balances.length;
  const D = _calculateInvariant(amp, balances, true);
  let S = BigInt(0);
  let D_P = D / BigInt(totalCoins);
  for (let i = 0; i < totalCoins; i++) {
    if (i != tokenIndexIn) {
      S = S + balances[i];
      D_P = (D_P * D) / (BigInt(totalCoins) * balances[i]);
    }
  }
  const x = balances[tokenIndexIn];
  const alpha = amp * BigInt(totalCoins);
  const beta = alpha * S; // units: 10 ** 21
  const gamma = BigInt(AMP_PRECISION) - alpha;
  const partial_x = BigInt(2) * alpha * x + beta + gamma * D;
  const minus_partial_D =
    D_P * BigInt(totalCoins + 1) * AMP_PRECISION - gamma * x;
  const ans = SolidityMaths.divUpFixed(
    (partial_x * bptSupply) / minus_partial_D,
    D
  );
  return ans;
}

function _calculateInvariant(
  amp: bigint,
  balances: bigint[],
  roundUp: boolean
): bigint {
  /**********************************************************************************************
    // invariant                                                                                 //
    // D = invariant                                                  D^(n+1)                    //
    // A = amplification coefficient      A  n^n S + D = A D n^n + -----------                   //
    // S = sum of balances                                             n^n P                     //
    // P = product of balances                                                                   //
    // n = number of tokens                                                                      //
    *********x************************************************************************************/

  // We support rounding up or down.

  let sum = BZERO;
  const numTokens = balances.length;
  for (let i = 0; i < numTokens; i++) {
    sum = sum + balances[i];
  }
  if (sum == BZERO) {
    return BZERO;
  }

  let prevInvariant = BZERO;
  let invariant = sum;
  const ampTimesTotal = amp * BigInt(numTokens);

  for (let i = 0; i < 255; i++) {
    let P_D = balances[0] * BigInt(numTokens);
    for (let j = 1; j < numTokens; j++) {
      P_D = SolidityMaths.div(
        SolidityMaths.mul(
          SolidityMaths.mul(P_D, balances[j]),
          BigInt(numTokens)
        ),
        invariant,
        roundUp
      );
    }
    prevInvariant = invariant;
    invariant = SolidityMaths.div(
      SolidityMaths.mul(
        SolidityMaths.mul(BigInt(numTokens), invariant),
        invariant
      ) +
        SolidityMaths.div(
          SolidityMaths.mul(SolidityMaths.mul(ampTimesTotal, sum), P_D),
          AMP_PRECISION,
          roundUp
        ),
      SolidityMaths.mul(BigInt(numTokens + 1), invariant) +
        // No need to use checked arithmetic for the amp precision, the amp is guaranteed to be at least 1
        SolidityMaths.div(
          SolidityMaths.mul(ampTimesTotal - AMP_PRECISION, P_D),
          AMP_PRECISION,
          !roundUp
        ),
      roundUp
    );

    if (invariant > prevInvariant) {
      if (invariant - prevInvariant <= 1) {
        return invariant;
      }
    } else if (prevInvariant - invariant <= 1) {
      return invariant;
    }
  }

  throw new Error('Errors.STABLE_INVARIANT_DIDNT_CONVERGE');
}
