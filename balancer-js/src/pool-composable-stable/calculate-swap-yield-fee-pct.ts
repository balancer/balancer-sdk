import { SolidityMaths } from '@/lib/utils/solidityMaths';
import { OldBigNumber, StableMaths } from '@balancer-labs/sor';
import { BigNumber, formatFixed, parseFixed } from '@ethersproject/bignumber';
import { calculateStableInvariant } from '@/pool-stable/calculate-invariant';

export const calculateSwapYieldFeePct = (
  amplificationParameter: bigint,
  balances: bigint[],
  currentPriceRates: bigint[],
  exemptedTokens: boolean[],
  lastInvariant: bigint,
  oldPriceRates: bigint[],
  protocolSwapFee: bigint,
  protocolYieldFee: bigint
): bigint => {
  console.log('amplificationParameter: ' + amplificationParameter);
  console.log('currentPriceRates: ' + currentPriceRates);
  console.log('oldPriceRates: ' + oldPriceRates);
  const swapFeeGrowthInvariant = getSwapFeeGrowthInvariant(
    balances,
    amplificationParameter,
    currentPriceRates,
    oldPriceRates
  );

  const nonExemptedYieldGrowthInvariant = !exemptedTokens.includes(false)
    ? swapFeeGrowthInvariant
    : getNonExemptedYieldGrowthInvariant(
        balances,
        amplificationParameter,
        currentPriceRates,
        oldPriceRates,
        exemptedTokens
      );
  const totalGrowthInvariant = !exemptedTokens.includes(true)
    ? nonExemptedYieldGrowthInvariant
    : BigInt(
        calculateStableInvariant(amplificationParameter, balances).toString()
      );
  console.log('swapFeeGrowthInvariant: ' + swapFeeGrowthInvariant);
  console.log('lastInvariant: ' + lastInvariant);
  const swapFeeGrowthInvariantDelta =
    swapFeeGrowthInvariant > lastInvariant
      ? swapFeeGrowthInvariant - lastInvariant
      : BigInt(0);
  console.log('swapFeeGrowthInvariantDelta: ' + swapFeeGrowthInvariantDelta);
  const nonExemptYieldGrowthInvariantDelta =
    nonExemptedYieldGrowthInvariant > swapFeeGrowthInvariant
      ? nonExemptedYieldGrowthInvariant - swapFeeGrowthInvariant
      : BigInt(0);
  const protocolSwapFeePct = SolidityMaths.mulDownFixed(
    SolidityMaths.divDownFixed(
      swapFeeGrowthInvariantDelta,
      totalGrowthInvariant
    ),
    protocolSwapFee
  );
  console.log('protocolSwapFeePct: ' + protocolSwapFeePct);
  const protocolYieldPct = SolidityMaths.mulDownFixed(
    SolidityMaths.divDownFixed(
      nonExemptYieldGrowthInvariantDelta,
      totalGrowthInvariant
    ),
    protocolYieldFee
  );
  console.log('protocolYieldFeePct: ' + protocolYieldPct);
  return SolidityMaths.add(protocolSwapFeePct, protocolYieldPct);
};

const getSwapFeeGrowthInvariant = (
  balances: bigint[],
  amplificationParameter: bigint,
  currentPriceRates: bigint[],
  oldPriceRates: bigint[]
): bigint => {
  console.log('balances: ' + balances);
  console.log('oldPriceRates: ' + oldPriceRates);
  console.log('currentPriceRates: ' + currentPriceRates);
  const balancesWithOldPriceRate = balances.map((balance, index) =>
    SolidityMaths.divDownFixed(
      SolidityMaths.mulUpFixed(balance, oldPriceRates[index]),
      currentPriceRates[index]
    )
  );
  return BigInt(
    calculateStableInvariant(
      amplificationParameter,
      balancesWithOldPriceRate
    ).toString()
  );
};

const getNonExemptedYieldGrowthInvariant = (
  balances: bigint[],
  amplificationParameter: bigint,
  currentPriceRates: bigint[],
  oldPriceRates: bigint[],
  exemptedTokens: boolean[]
) => {
  const balancesWithOnlyExemptedTokensWithOldPriceRate = balances.map(
    (balance, index) =>
      exemptedTokens[index]
        ? SolidityMaths.divDownFixed(
            SolidityMaths.mulDownFixed(balance, oldPriceRates[index]),
            currentPriceRates[index]
          )
        : balance
  );
  return BigInt(
    calculateStableInvariant(
      amplificationParameter,
      balancesWithOnlyExemptedTokensWithOldPriceRate
    ).toString()
  );
};
