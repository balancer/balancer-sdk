import { Pool } from '@/types';
import { parseFixed, parsePoolInfo } from '@/lib/utils';
import { SolidityMaths } from '@/lib/utils/solidityMaths';
import { calcDueTokenProtocolSwapFeeAmount } from '@/pool-weighted/calculate-protocol-fee-token-amount';
import { WeightedMaths } from '@balancer-labs/sor';

export default class WeightedV1ProtocolFee {
  static calculateProtocolFees(pool: Pool): bigint[] {
    const parsedPool = parsePoolInfo(pool);
    const currentInvariant = WeightedMaths._calculateInvariant(
      parsedPool.parsedWeights.map(BigInt),
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
    parsedWeights,
    lastJoinExitInvariant,
    currentInvariant,
    protocolSwapFeePct,
  }: {
    upScaledBalances: string[];
    lastJoinExitInvariant: string;
    parsedWeights: string[];
    protocolSwapFeePct: string;
    currentInvariant: bigint;
  }): bigint[] => {
    const protocolFeeAmounts = Array(upScaledBalances.length).fill(BigInt(0));
    if (BigInt(protocolSwapFeePct) === BigInt(0)) {
      return protocolFeeAmounts;
    }
    const normalizedWeightsBigInt = parsedWeights.map(BigInt);
    const maxWeightTokenIndex = normalizedWeightsBigInt.indexOf(
      SolidityMaths.max(...normalizedWeightsBigInt)
    );
    protocolFeeAmounts[maxWeightTokenIndex] = calcDueTokenProtocolSwapFeeAmount(
      BigInt(upScaledBalances[maxWeightTokenIndex]),
      normalizedWeightsBigInt[maxWeightTokenIndex],
      BigInt(lastJoinExitInvariant),
      currentInvariant,
      parseFixed(protocolSwapFeePct, 18).toBigInt()
    );
    return protocolFeeAmounts;
  };
}
