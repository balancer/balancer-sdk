import { PriceImpactConcern } from '../types';
import { SubgraphPoolBase, WeightedPool, ZERO } from '@balancer-labs/sor';
import * as SOR from '@balancer-labs/sor/dist/index';
import * as GSDK from '@georgeroman/balancer-v2-pools';
import { BigNumber } from 'ethers';
import { cloneDeep } from 'lodash';
import { MathSol } from '@/utils/basicOperations';
import { One } from '@ethersproject/constants';
import { BalancerError } from '@/balancerErrors';

const ONE = BigInt('1000000000000000000');

function realNumberToEvm(stringNumber: string): bigint {
  return BigInt(
    SOR.bnum(stringNumber)
      .times(10 ** 18)
      .dp(0)
      .toString()
  );
}

function evmToRealNumber(bigintNumber: bigint): string {
  return SOR.bnum(bigintNumber.toString())
    .div(10 ** 18)
    .toString();
}

export class WeightedPoolPriceImpact implements PriceImpactConcern {
  bptZeroPriceImpact(pool: SubgraphPoolBase, amounts: string[]): string {
    const bigIntAmounts = amounts.map((amount) =>
      BigInt(realNumberToEvm(amount))
    );
    const weightedPool = WeightedPool.fromPool(pool);
    const tokensList = cloneDeep(pool.tokensList);
    const n = tokensList.length;
    // Should the following check throw an error?
    if (amounts.length !== tokensList.length) return 'array length mismatch';
    const totalShares = BigInt(weightedPool.totalShares.toString());
    let bptZeroPriceImpact = BigInt(0);
    for (let i = 0; i < n; i++) {
      const weight =
        (realNumberToEvm(weightedPool.tokens[i].weight) *
          weightedPool.totalWeight.toBigInt()) /
        ONE;
      const balance = realNumberToEvm(weightedPool.tokens[i].balance);
      const price = (weight * totalShares) / balance;
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
    const bptZeroPriceImpact = this.bptZeroPriceImpact(pool, tokenAmounts);
    // Compute BPT amount
    // answer = bptAmount / bptZeroPriceImpact - 1
    return '';
  }
}
