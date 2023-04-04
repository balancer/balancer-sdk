import { SolidityMaths } from '@/lib/utils/solidityMaths';
import { OldBigNumber, StableMaths } from '@balancer-labs/sor';
import { BigNumber, parseFixed } from '@ethersproject/bignumber';

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
        StableMaths._invariant(
          BigNumber.from(amplificationParameter),
          balances.map(BigNumber.from)
        ).toString()
      );

  const swapFeeGrowthInvariantDelta =
    swapFeeGrowthInvariant > lastInvariant
      ? swapFeeGrowthInvariant - lastInvariant
      : BigInt(0);
  const nonExemptYieldGrowthInvariantDelta =
    nonExemptedYieldGrowthInvariant > swapFeeGrowthInvariant
      ? nonExemptedYieldGrowthInvariant - swapFeeGrowthInvariant
      : BigInt(0);
  console.log('total invariant:' + totalGrowthInvariant);
  console.log('swap invariant delta :' + swapFeeGrowthInvariantDelta);
  console.log(
    'non exempt invariant delta :' + nonExemptYieldGrowthInvariantDelta
  );
  const protocolSwapFeePct = SolidityMaths.mulDownFixed(
    SolidityMaths.divDownFixed(
      swapFeeGrowthInvariantDelta,
      totalGrowthInvariant
    ),
    protocolSwapFee
  );
  const protocolYieldPct = SolidityMaths.mulDownFixed(
    SolidityMaths.divDownFixed(
      nonExemptYieldGrowthInvariantDelta,
      totalGrowthInvariant
    ),
    protocolYieldFee
  );
  return SolidityMaths.add(protocolSwapFeePct, protocolYieldPct);
};

const getSwapFeeGrowthInvariant = (
  balances: bigint[],
  amplificationParameter: bigint,
  currentPriceRates: bigint[],
  oldPriceRates: bigint[]
): bigint => {
  const balancesWithOldPriceRate = balances.map((balance, index) =>
    SolidityMaths.divDownFixed(
      SolidityMaths.mulDownFixed(balance, oldPriceRates[index]),
      currentPriceRates[index]
    ).toString()
  );
  return parseFixed(
    StableMaths._invariant(
      BigNumber.from(amplificationParameter),
      balancesWithOldPriceRate.map((balance) => new OldBigNumber(balance))
    ).toString(),
    18
  ).toBigInt();
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
          ).toString()
        : balance
  );
  return parseFixed(
    StableMaths._invariant(
      BigNumber.from(amplificationParameter),
      balancesWithOnlyExemptedTokensWithOldPriceRate.map(
        (balance) => new OldBigNumber(balance)
      )
    ).toString(),
    18
  ).toBigInt();
};
