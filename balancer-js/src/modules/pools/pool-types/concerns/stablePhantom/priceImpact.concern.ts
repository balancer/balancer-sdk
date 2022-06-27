import { PriceImpactConcern } from '../types';
import { SubgraphPoolBase, PhantomStablePool, ZERO } from '@balancer-labs/sor';
import * as SOR from '@balancer-labs/sor/dist/index';
import * as GSDK from '@georgeroman/balancer-v2-pools';
import { cloneDeep } from 'lodash';
//import { StablePhantom } from '../../stablePhantom.module';

const ONE = BigInt('1000000000000000000');

function realNumberToEvm(stringNumber: string): bigint {
  return BigInt(
    SOR.bnum(stringNumber)
      .times(10 ** 18)
      .dp(0)
      .toString()
  );
}

function evmToRealNumber(bigIntNumber: bigint): string {
  return SOR.bnum(bigIntNumber.toString())
    .div(10 ** 18)
    .toString();
}

export class PhantomStablePriceImpact implements PriceImpactConcern {
  bptZeroPriceImpact(pool: SubgraphPoolBase, amounts: string[]): string {
    const bigIntAmounts = amounts.map((amount) => realNumberToEvm(amount));
    const phantomStablePool = PhantomStablePool.fromPool(pool);
    const tokensList = cloneDeep(pool.tokensList);
    const bptIndex = tokensList.findIndex((token) => token == pool.address);
    tokensList.splice(bptIndex, 1);
    let bptZeroPriceImpact = BigInt(0);
    const n = tokensList.length;
    for (let i = 0; i < n; i++) {
      const poolPairData = phantomStablePool.parsePoolPairData(
        tokensList[i],
        pool.address
      );
      const price = realNumberToEvm(
        phantomStablePool
          ._spotPriceAfterSwapExactTokenInForTokenOut(poolPairData, ZERO)
          .toString()
      );
      bptZeroPriceImpact += (bigIntAmounts[i] * price) / ONE;
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
