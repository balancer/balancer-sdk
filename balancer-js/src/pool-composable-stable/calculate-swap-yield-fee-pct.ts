import { SolidityMaths } from '@/lib/utils/solidityMaths';
import { calculateStableInvariant } from '@/pool-stable/calculate-invariant';

export const calculateSwapYieldFeePct = (
  balances: string[],
  amplificationParameter: string,
  lastInvariant: bigint,
  currentPriceRates: bigint[],
  oldPriceRates: bigint[],
  exemptedTokens: boolean[],
  protocolSwapFeeCache: bigint,
  protocolYieldFeeCache: bigint
): bigint => {
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
    : calculateStableInvariant(amplificationParameter, balances);

  const swapFeeGrowthInvariantDelta =
    swapFeeGrowthInvariant > lastInvariant
      ? swapFeeGrowthInvariant - lastInvariant
      : BigInt(0);
  const nonExemptYieldGrowthInvariantDelta =
    nonExemptedYieldGrowthInvariant > swapFeeGrowthInvariant
      ? nonExemptedYieldGrowthInvariant - swapFeeGrowthInvariant
      : BigInt(0);
  const protocolSwapFeePct = SolidityMaths.mulDownFixed(
    SolidityMaths.divDownFixed(
      swapFeeGrowthInvariantDelta,
      totalGrowthInvariant
    ),
    protocolSwapFeeCache
  );
  const protocolYieldPct = SolidityMaths.mulDownFixed(
    SolidityMaths.divDownFixed(
      nonExemptYieldGrowthInvariantDelta,
      totalGrowthInvariant
    ),
    protocolYieldFeeCache
  );
  return SolidityMaths.add(protocolSwapFeePct, protocolYieldPct);
};

const getSwapFeeGrowthInvariant = (
  balances: string[],
  amplificationParameter: string,
  currentPriceRates: bigint[],
  oldPriceRates: bigint[]
) => {
  const balancesWithOldPriceRate = balances.map((balance, index) =>
    SolidityMaths.divDownFixed(
      SolidityMaths.mulDownFixed(BigInt(balance), oldPriceRates[index]),
      currentPriceRates[index]
    ).toString()
  );
  return calculateStableInvariant(
    amplificationParameter,
    balancesWithOldPriceRate
  );
};

const getNonExemptedYieldGrowthInvariant = (
  balances: string[],
  amplificationParameter: string,
  currentPriceRates: bigint[],
  oldPriceRates: bigint[],
  exemptedTokens: boolean[]
) => {
  const balancesWithOnlyExemptedTokensWithOldPriceRate = balances.map(
    (balance, index) =>
      exemptedTokens[index]
        ? SolidityMaths.divDownFixed(
            SolidityMaths.mulDownFixed(BigInt(balance), oldPriceRates[index]),
            currentPriceRates[index]
          ).toString()
        : balance
  );
  return calculateStableInvariant(
    amplificationParameter,
    balancesWithOnlyExemptedTokensWithOldPriceRate
  );
};
