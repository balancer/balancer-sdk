import { Pool } from '@/types';
import { calculateInvariant } from '@/pool-weighted/calculate-invariant';
import { parseFixed, parsePoolInfoForProtocolFee } from '@/lib/utils';
import { SolidityMaths } from '@/lib/utils/solidityMaths';
import { calcDueTokenProtocolSwapFeeAmount } from '@/pool-weighted/calculate-protocol-fee-token-amount';

export default class WeightedV1ProtocolFee {
  static calculateProtocolFees(pool: Pool): bigint {
    const parsedPool = parsePoolInfoForProtocolFee(pool);
    const currentInvariant = calculateInvariant(parsedPool);
    const protocolFeeAmounts = WeightedV1ProtocolFee.getDueProtocolFeeAmounts({
      ...parsedPool,
      currentInvariant,
    });
    return BigInt(0);
  }

  static getDueProtocolFeeAmounts = ({
    balances,
    normalizedWeights,
    lastInvariant,
    currentInvariant,
    protocolSwapFeePct,
  }: {
    balances: string[];
    lastInvariant: string;
    normalizedWeights: string[];
    protocolSwapFeePct: string;
    currentInvariant: bigint;
  }): bigint[] => {
    const protocolFeeAmounts = Array(balances.length).fill(BigInt(0));
    if (BigInt(protocolSwapFeePct) === BigInt(0)) {
      return protocolFeeAmounts;
    }
    const normalizedWeightsBigInt = normalizedWeights.map(BigInt);
    const maxWeightTokenIndex = normalizedWeightsBigInt.indexOf(
      SolidityMaths.max(...normalizedWeightsBigInt)
    );
    protocolFeeAmounts[maxWeightTokenIndex] = calcDueTokenProtocolSwapFeeAmount(
      BigInt(balances[maxWeightTokenIndex]),
      normalizedWeightsBigInt[maxWeightTokenIndex],
      BigInt(lastInvariant),
      currentInvariant,
      parseFixed(protocolSwapFeePct, 18).toBigInt()
    );
    return protocolFeeAmounts;
  };
}
