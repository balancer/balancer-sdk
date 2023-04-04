import { Pool } from '@/types';
import { parsePoolInfo } from '@/lib/utils';
import { SolidityMaths } from '@/lib/utils/solidityMaths';
import { WeightedMaths } from '@balancer-labs/sor';
import { calculateSwapYieldOwnershipPct } from '@/pool-weighted/calculate-swap-yield-ownership-pct';

export default class WeightedV2ProtocolFee {
  static async calculateProtocolFees(pool: Pool): Promise<bigint> {
    const parsedPool = parsePoolInfo(pool);
    const currentInvariant = WeightedMaths._calculateInvariant(
      parsedPool.weights,
      parsedPool.upScaledBalances
    );
    const athRateProduct = BigInt(0);
    const protocolFeeAmounts =
      WeightedV2ProtocolFee.getDueBPTProtocolFeeAmounts({
        ...parsedPool,
        athRateProduct,
        currentInvariant,
      });
    return protocolFeeAmounts;
  }

  static getDueBPTProtocolFeeAmounts = ({
    athRateProduct,
    currentInvariant,
    exemptedTokens,
    lastPostJoinExitInvariant,
    priceRates,
    weights,
    protocolSwapFeePct,
    protocolYieldFeePct,
    totalSharesEvm,
  }: {
    athRateProduct: bigint;
    currentInvariant: bigint;
    exemptedTokens: boolean[];
    lastPostJoinExitInvariant: bigint;
    priceRates: bigint[];
    weights: bigint[];
    protocolSwapFeePct: bigint;
    protocolYieldFeePct: bigint;
    totalSharesEvm: bigint;
  }): bigint => {
    const poolOwnershipPercentage = calculateSwapYieldOwnershipPct({
      athRateProduct,
      currentInvariant,
      exemptedTokens,
      lastPostJoinExitInvariant,
      priceRates,
      weights,
      protocolSwapFeePct,
      protocolYieldFeePct,
    });
    // If we mint some amount `bptAmount` of BPT then the percentage ownership of the pool this grants is given by:
    // `poolOwnershipPercentage = bptAmount / (totalSupply + bptAmount)`.
    // Solving for `bptAmount`, we arrive at:
    // `bptAmount = totalSupply * poolOwnershipPercentage / (1 - poolOwnershipPercentage)`.
    const bptAmount = SolidityMaths.divDownFixed(
      SolidityMaths.mulUpFixed(totalSharesEvm, poolOwnershipPercentage),
      SolidityMaths.complementFixed(poolOwnershipPercentage)
    );
    return bptAmount;
  };
}
