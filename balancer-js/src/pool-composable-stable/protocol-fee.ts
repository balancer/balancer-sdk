import { Pool } from '@/types';
import { parsePoolInfoForProtocolFee } from '@/lib/utils';
import { calculateSwapYieldFeePct } from '@/pool-composable-stable/calculate-swap-yield-fee-pct';

export default class ComposableStableProtocolFee {
  static calculateProtocolFees(pool: Pool) {
    const parsedPool = parsePoolInfoForProtocolFee(pool);
    const protocolFeeAmount =
      ComposableStableProtocolFee.calDueBPTProtocolFeeAmount(parsedPool);
  }

  static calDueBPTProtocolFeeAmount = ({
    balancesWithoutBPT,
    amplificationParameter,
    lastInvariant,
    virtualSupply,
  }: {
    balancesWithoutBPT: string[];
    amplificationParameter: string;
    lastInvariant: string;
    virtualSupply: string;
  }): bigint => {
    const protocolFeePct = calculateSwapYieldFeePct(
      balancesWithoutBPT.map(BigInt),
      BigInt(amplificationParameter),
      BigInt(lastInvariant)
    );
    return BigInt(0);
  };
}
