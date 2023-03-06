import { Pool } from '@/types';
import { parsePoolInfo } from '@/lib/utils';
import { SolidityMaths } from '@/lib/utils/solidityMaths';
import { WeightedMaths } from '@balancer-labs/sor';
import { calculateSwapYieldOwnershipPct } from '@/pool-weighted/calculate-swap-yield-ownership-pct';

export default class WeightedV2ProtocolFee {
  static calculateProtocolFees(pool: Pool): bigint {
    const parsedPool = parsePoolInfo(pool);
    const currentInvariant = WeightedMaths._calculateInvariant(
      parsedPool.parsedWeights.map(BigInt),
      parsedPool.upScaledBalances.map(BigInt)
    );
    const protocolFeeAmounts =
      WeightedV2ProtocolFee.getDueBPTProtocolFeeAmounts({
        ...parsedPool,
        currentInvariant,
      });
    return protocolFeeAmounts;
  }

  static getDueBPTProtocolFeeAmounts = ({
    athRateProduct,
    currentInvariant,
    exemptedTokens,
    lastJoinExitInvariant,
    parsedPriceRates,
    parsedWeights,
    protocolSwapFeePct,
    protocolYieldFeePct,
    totalShares,
  }: {
    athRateProduct: string;
    currentInvariant: bigint;
    exemptedTokens: boolean[];
    lastJoinExitInvariant: string;
    parsedPriceRates: string[];
    parsedWeights: string[];
    protocolSwapFeePct: string;
    protocolYieldFeePct: string;
    totalShares: string;
  }): bigint => {
    const poolOwnershipPercentage = calculateSwapYieldOwnershipPct({
      athRateProduct,
      currentInvariant,
      exemptedTokens,
      lastJoinExitInvariant,
      parsedPriceRates,
      parsedWeights,
      protocolSwapFeePct,
      protocolYieldFeePct,
    });
    // If we mint some amount `bptAmount` of BPT then the percentage ownership of the pool this grants is given by:
    // `poolOwnershipPercentage = bptAmount / (totalSupply + bptAmount)`.
    // Solving for `bptAmount`, we arrive at:
    // `bptAmount = totalSupply * poolOwnershipPercentage / (1 - poolOwnershipPercentage)`.
    const bptAmount = SolidityMaths.divDownFixed(
      SolidityMaths.mulUpFixed(BigInt(totalShares), poolOwnershipPercentage),
      SolidityMaths.complementFixed(poolOwnershipPercentage)
    );
    return bptAmount;
  };
}
