import { Pool } from '@/types';
import { parsePoolInfo } from '@/lib/utils';
import { SolidityMaths } from '@/lib/utils/solidityMaths';
import { calcDueTokenProtocolSwapFeeAmount } from '@/pool-weighted/calculate-protocol-fee-token-amount';
import { WeightedMaths } from '@balancer-labs/sor';

export default class WeightedV1ProtocolFee {
  static calculateProtocolFees(pool: Pool): bigint[] {
    const parsedPool = parsePoolInfo(pool);
    const currentInvariant = WeightedMaths._calculateInvariant(
      parsedPool.weights.map(BigInt),
      parsedPool.upScaledBalances.map(BigInt)
    );
    const protocolFeeAmounts = WeightedV1ProtocolFee.getDueProtocolFeeAmounts({
      ...parsedPool,
      currentInvariant,
    });
    return protocolFeeAmounts;
  }

  static getDueProtocolFeeAmounts = ({
    upScaledBalances,
    weights,
    lastPostJoinExitInvariant,
    currentInvariant,
    protocolSwapFeePct,
  }: {
    upScaledBalances: bigint[];
    lastPostJoinExitInvariant: bigint;
    weights: bigint[];
    protocolSwapFeePct: bigint;
    currentInvariant: bigint;
  }): bigint[] => {
    const protocolFeeAmounts = Array(upScaledBalances.length).fill(BigInt(0));
    if (BigInt(protocolSwapFeePct) === BigInt(0)) {
      return protocolFeeAmounts;
    }
    const maxWeightTokenIndex = weights.indexOf(SolidityMaths.max(weights));
    protocolFeeAmounts[maxWeightTokenIndex] = calcDueTokenProtocolSwapFeeAmount(
      upScaledBalances[maxWeightTokenIndex],
      weights[maxWeightTokenIndex],
      lastPostJoinExitInvariant,
      currentInvariant,
      protocolSwapFeePct
    );
    return protocolFeeAmounts;
  };
}
