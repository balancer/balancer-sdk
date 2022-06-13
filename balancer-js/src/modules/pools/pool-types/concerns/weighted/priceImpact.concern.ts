import { PriceImpactConcern } from '../types';
import { SubgraphPoolBase, WeightedPool, ZERO } from '@balancer-labs/sor';
import * as SOR from '@balancer-labs/sor/dist/index';
import * as GSDK from '@georgeroman/balancer-v2-pools';
import { BigNumber } from 'ethers';

export class WeightedPoolPriceImpact implements PriceImpactConcern {
  calcPriceImpact(
    tokenAmounts: string[],
    isJoin: boolean,
    isExactOut: boolean,
    pool: SubgraphPoolBase
  ): string {
    const weightedPool = WeightedPool.fromPool(pool);

    const decimals = weightedPool.tokens.map((token) => token.decimals);
    const bptTotalSupply = weightedPool.totalShares;
    const fee = weightedPool.swapFee;

    const balancesString = weightedPool.tokens.map((token) => token.balance);
    const balances = balancesString.map((balance, i) =>
      SOR.bnum(balance)
        .times(10 ** decimals[i])
        .toString()
    );

    const weightsString = weightedPool.tokens.map((token) => token.weight);
    const bnumWeights = weightsString.map((weight) => SOR.bnum(weight));
    const bnumTotalWeight = bnumWeights.reduce((sum, weight) => {
      return sum.plus(weight);
    }, SOR.bnum(0));
    SOR.bnum(weightedPool.totalWeight.toString());
    const bnumNormalizedWeights = bnumWeights.map((weight) =>
      weight.div(bnumTotalWeight)
    );
    const normalizedWeights = bnumNormalizedWeights.map((weight) =>
      BigNumber.from(weight.times(10 ** 18).toString())
    );
    const amounts = tokenAmounts.map((amount, i) =>
      SOR.bnum(amount)
        .times(10 ** decimals[i])
        .toString()
    );

    const bnumBalances = balancesString.map((balance) => SOR.bnum(balance));
    const bnumAmounts = tokenAmounts.map((amount) => SOR.bnum(amount));
    const bnumBPTTotalSupply = SOR.bnum(bptTotalSupply.toString()).div(
      10 ** 18
    );
    const bnumFee = SOR.bnum(fee.toString()).div(10 ** 18);

    console.log(bnumBalances.toString());
    console.log(bnumNormalizedWeights.toString());
    console.log(bnumAmounts.toString());
    console.log(bnumBPTTotalSupply.toString());
    console.log(bnumFee.toString());
    // if (isJoin) {
    const bptAmount = GSDK.WeightedMath._calcBptOutGivenExactTokensIn(
      bnumBalances,
      bnumNormalizedWeights,
      bnumAmounts,
      bnumBPTTotalSupply,
      bnumFee
    );
    // if (bptAmount.lt(ZERO)) return '0';
    console.log(' ');
    console.log(' ');
    console.log(balances.toString());
    console.log(normalizedWeights.toString());
    console.log(amounts.toString());
    console.log(bptTotalSupply.toString());

    const bptZeroPriceImpact = SOR.weightedBPTForTokensZeroPriceImpact(
      balances,
      decimals,
      normalizedWeights,
      amounts,
      bptTotalSupply
    );
    /*
      SOR.bnum(1)
        .minus(
          bptAmount.div(SOR.bnum(bptZeroPriceImpact.toString()).div(10 ** 18))
        )
        .toString();
    } else return '';*/
    return bptZeroPriceImpact.toString();
  }
}
