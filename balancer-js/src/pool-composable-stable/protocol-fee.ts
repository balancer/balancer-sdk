import { Pool } from '@/types';
import { calculateSwapYieldFeePct } from '@/pool-composable-stable/calculate-swap-yield-fee-pct';
import { SolidityMaths } from '@/lib/utils/solidityMaths';
import { parsePoolInfo } from '@/lib/utils';

export default class ComposableStableProtocolFee {
  static calculateProtocolFees(pool: Pool): bigint {
    const parsedPool = parsePoolInfo(pool);
    const protocolFeeAmount =
      ComposableStableProtocolFee.calDueBPTProtocolFeeAmount(parsedPool);
    return protocolFeeAmount;
  }

  static calDueBPTProtocolFeeAmount = ({
    parsedAmp,
    upScaledBalancesWithoutBpt,
    parsedPriceRates,
    exemptedTokens,
    lastJoinExitInvariant,
    parsedOldPriceRates,
    protocolSwapFeePct,
    protocolYieldFeePct,
    virtualSupply,
  }: {
    parsedAmp: string;
    upScaledBalancesWithoutBpt: string[];
    parsedPriceRates: string[];
    exemptedTokens: boolean[];
    lastJoinExitInvariant: string;
    parsedOldPriceRates: string[];
    protocolSwapFeePct: string;
    protocolYieldFeePct: string;
    virtualSupply: string;
  }): bigint => {
    const protocolFeePct = calculateSwapYieldFeePct(
      parsedAmp,
      upScaledBalancesWithoutBpt,
      parsedPriceRates.map(BigInt),
      exemptedTokens,
      BigInt(lastJoinExitInvariant),
      parsedOldPriceRates.map(BigInt),
      BigInt(protocolSwapFeePct),
      BigInt(protocolYieldFeePct)
    );

    // Since this fee amount will be minted as BPT, which increases the total supply, we need to mint
    // slightly more so that it reflects this percentage of the total supply after minting.
    //
    // The percentage of the Pool the protocol will own after minting is given by:
    // `protocol percentage = to mint / (current supply + to mint)`.
    // Solving for `to mint`, we arrive at:
    // `to mint = current supply * protocol percentage / (1 - protocol percentage)`.
    const bptProtocolFeeAmount = SolidityMaths.divDownFixed(
      SolidityMaths.mulDownFixed(BigInt(virtualSupply), protocolFeePct),
      SolidityMaths.complementFixed(protocolFeePct)
    );
    return bptProtocolFeeAmount;
  };
}
