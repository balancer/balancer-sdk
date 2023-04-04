import { ONE, SolidityMaths } from '@/lib/utils/solidityMaths';

export const calculateSwapYieldOwnershipPct = ({
  athRateProduct,
  currentInvariant,
  exemptedTokens,
  lastPostJoinExitInvariant,
  priceRates,
  weights,
  protocolSwapFeePct,
  protocolYieldFeePct,
}: {
  athRateProduct: bigint;
  currentInvariant: bigint;
  exemptedTokens: boolean[];
  lastPostJoinExitInvariant: bigint;
  priceRates: bigint[];
  weights: bigint[];
  protocolSwapFeePct: bigint;
  protocolYieldFeePct: bigint;
}): bigint => {
  const protocolSwapFeeOwnershipPct = _getSwapProtocolFeesPoolPercentage(
    currentInvariant,
    lastPostJoinExitInvariant,
    protocolSwapFeePct
  );
  const protocolYieldFeeOwnershipPct = _getYieldProtocolFeesPoolPercentage(
    athRateProduct,
    exemptedTokens,
    priceRates,
    weights,
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
  lastPostJoinExitInvariant: bigint,
  protocolSwapFeePct: bigint
): bigint => {
  if (
    protocolSwapFeePct <= BigInt(0) ||
    currentInvariant <= lastPostJoinExitInvariant
  ) {
    return BigInt(0);
  }
  const invariantRatio = SolidityMaths.divDownFixed(
    currentInvariant,
    lastPostJoinExitInvariant
  );
  const swapFeePercentage = SolidityMaths.sub(
    ONE,
    SolidityMaths.divDownFixed(ONE, invariantRatio)
  );
  const protocolSwapFeeGrowthPct = SolidityMaths.mulDownFixed(
    swapFeePercentage,
    protocolSwapFeePct
  );
  return protocolSwapFeeGrowthPct;
};

const _getYieldProtocolFeesPoolPercentage = (
  athRateProduct: bigint,
  exemptedTokens: boolean[],
  priceRates: bigint[],
  weights: bigint[],
  protocolYieldFeePct: bigint
): bigint => {
  const rateProduct = calculateRateProduct(weights, priceRates);
  if (athRateProduct >= rateProduct || protocolYieldFeePct <= 0) {
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
  normalizedWeights: bigint[],
  priceRates: bigint[]
): bigint => {
  const rateProduct = normalizedWeights.reduce(
    (acc, weight, index) =>
      SolidityMaths.mulDownFixed(
        acc,
        SolidityMaths.powDownFixed(priceRates[index], weight)
      ),
    BigInt(1)
  );
  return rateProduct;
};
