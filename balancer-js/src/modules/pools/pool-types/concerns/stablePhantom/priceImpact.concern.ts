import { PriceImpactConcern } from '../types';
import { SubgraphPoolBase, PhantomStablePool, ZERO } from '@balancer-labs/sor';
import * as SOR from '@balancer-labs/sor/dist/index';
import * as GSDK from '@georgeroman/balancer-v2-pools';

export class PhantomStablePriceImpact implements PriceImpactConcern {
  calcPriceImpact(
    tokenAmounts: string[],
    isJoin: boolean,
    isExactOut: boolean,
    pool: SubgraphPoolBase
  ): string {
    const phantomStablePool = PhantomStablePool.fromPool(pool);
    const poolAddress = phantomStablePool.address;
    const tokenAddresses = phantomStablePool.tokens.map(
      (token) => token.address
    );
    const bptIndex = tokenAddresses.findIndex(
      (tokenAddress) => tokenAddress == poolAddress
    );
    const decimals = phantomStablePool.tokens.map((token) => token.decimals);
    const balancesString = phantomStablePool.tokens.map(
      (token) => token.balance
    );
    const balances = balancesString.map((balance, i) =>
      SOR.bnum(balance)
        .times(10 ** decimals[i])
        .toString()
    );
    const amounts = tokenAmounts.map((amount, i) =>
      SOR.bnum(amount)
        .times(10 ** decimals[i])
        .toString()
    );
    const rates = phantomStablePool.tokens.map((token) => token.priceRate);

    console.log(balances);
    const bptZeroPriceImpact = SOR.phantomStableBPTForTokensZeroPriceImpact(
      balances,
      decimals,
      amounts,
      phantomStablePool.totalShares,
      phantomStablePool.amp,
      phantomStablePool.swapFee,
      rates
    );
    console.log('bptZeroPriceImpact: ', bptZeroPriceImpact.toString());

    // For BPT amount, it should be preferrable to use bigint math from SOR.
    // How do we import this?
    const bnumTokenAmounts = tokenAmounts.map((amount) => SOR.bnum(amount));
    const bnumAmp = SOR.bnum(phantomStablePool.amp.toString()).div(10 ** 3); // is this scaling correct?
    const bnumBalances = balancesString.map((balance) => SOR.bnum(balance));
    const bnumBPTTotalSupply = SOR.bnum(
      phantomStablePool.totalShares.toString()
    ).div(10 ** 18);
    const bnumFee = SOR.bnum(phantomStablePool.swapFee.toString()).div(
      10 ** 18
    );
    console.log(bnumAmp.toString());
    console.log(bnumBalances.toString());
    console.log(bnumTokenAmounts.toString());
    console.log(bnumBPTTotalSupply.toString());
    console.log(bnumFee.toString());
    const bptAmount = GSDK.StableMath._calcBptOutGivenExactTokensIn(
      bnumAmp,
      bnumBalances,
      bnumTokenAmounts,
      bnumBPTTotalSupply,
      bnumFee
    );
    console.log('bptAmount: ', bptAmount);
    const bnumBptZeroPriceImpact = SOR.bnum(bptZeroPriceImpact.toString()).div(
      10 ** 18
    );
    const answer = SOR.bnum(bptAmount).div(bnumBptZeroPriceImpact).minus(1);
    return answer.toString();
  }
}
