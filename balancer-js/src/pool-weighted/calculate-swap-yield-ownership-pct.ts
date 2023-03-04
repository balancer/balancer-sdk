import { ONE, SolidityMaths } from '@/lib/utils/solidityMaths';

export const calculateSwapYieldOwnershipPct = ({
  athRateProduct,
  currentInvariant,
  exemptedTokens,
  lastJoinExitInvariant,
  parsedPriceRates,
  parsedWeights,
  protocolSwapFeePct,
  protocolYieldFeePct,
}: {
  athRateProduct: string;
  currentInvariant: bigint;
  exemptedTokens: boolean[];
  lastJoinExitInvariant: string;
  parsedPriceRates: string[];
  parsedWeights: string[];
  protocolSwapFeePct: string;
  protocolYieldFeePct: string;
}): bigint => {
  const protocolSwapFeeOwnershipPct = _getSwapProtocolFeesPoolPercentage(
    currentInvariant,
    lastJoinExitInvariant,
    protocolSwapFeePct
  );
  const protocolYieldFeeOwnershipPct = _getYieldProtocolFeesPoolPercentage(
    athRateProduct,
    exemptedTokens,
    parsedPriceRates,
    parsedWeights,
    protocolYieldFeePct
  );
  const poolOwnershipPercentage = SolidityMaths.add(
    protocolSwapFeeOwnershipPct,
    protocolYieldFeeOwnershipPct
  );
  return poolOwnershipPercentage;
};

const _getSwapProtocolFeesPoolPercentage = (
  currentInvariant: bigint,
  lastJoinExitInvariant: string,
  protocolSwapFeePct: string
): bigint => {
  if (
    BigInt(protocolSwapFeePct) <= BigInt(0) ||
    currentInvariant <= BigInt(lastJoinExitInvariant)
  ) {
    return BigInt(0);
  }
  const invariantRatio = SolidityMaths.divDownFixed(
    currentInvariant,
    BigInt(lastJoinExitInvariant)
  );
  const swapFeePercentage = SolidityMaths.sub(
    ONE,
    SolidityMaths.divDownFixed(ONE, invariantRatio)
  );
  const protocolSwapFeeGrowthPct = SolidityMaths.mulDownFixed(
    swapFeePercentage,
    BigInt(protocolSwapFeePct)
  );
  return protocolSwapFeeGrowthPct;
};

const _getYieldProtocolFeesPoolPercentage = (
  athRateProduct: string,
  exemptedTokens: boolean[],
  parsedPriceRates: string[],
  parsedWeights: string[],
  protocolYieldFeePct: string
): bigint => {
  const rateProduct = calculateRateProduct(parsedWeights, parsedPriceRates);
  if (
    BigInt(athRateProduct) >= BigInt(rateProduct) ||
    BigInt(protocolYieldFeePct) <= 0
  ) {
    return BigInt(0);
  }
  const rateProductRatio = SolidityMaths.divDownFixed(
    rateProduct,
    BigInt(athRateProduct)
  );
  const yieldFeePercentage = SolidityMaths.sub(
    ONE,
    SolidityMaths.divDownFixed(ONE, rateProductRatio)
  );
  const protocolYieldFeeGrowthPct = SolidityMaths.mulDownFixed(
    yieldFeePercentage,
    BigInt(protocolYieldFeePct)
  );
  return protocolYieldFeeGrowthPct;
};

const calculateRateProduct = (
  normalizedWeights: string[],
  priceRates: string[]
): bigint => {
  const rateProduct = normalizedWeights.reduce(
    (acc, weight, index) =>
      SolidityMaths.mulDownFixed(
        acc,
        SolidityMaths.powDownFixed(BigInt(priceRates[index]), BigInt(weight))
      ),
    BigInt(1)
  );
  return rateProduct;
};
