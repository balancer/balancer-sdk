import { Pool } from '@/types';
import { parsePoolInfoForProtocolFee } from '@/lib/utils';
import { calculateSwapYieldFeePct } from '@/pool-composable-stable/calculate-swap-yield-fee-pct';
import { SolidityMaths } from '@/lib/utils/solidityMaths';

export default class ComposableStableProtocolFee {
  static calculateProtocolFees(pool: Pool): bigint {
    const parsedPool = parsePoolInfoForProtocolFee(pool);
    const protocolFeeAmount =
      ComposableStableProtocolFee.calDueBPTProtocolFeeAmount(parsedPool);
    return protocolFeeAmount;
  }

  static calDueBPTProtocolFeeAmount = ({
    amplificationParameter,
    balancesWithoutBPT,
    currentPriceRates,
    exemptedTokens,
    lastInvariant,
    oldPriceRates,
    protocolSwapFeePct,
    protocolYieldFeePct,
    virtualSupply,
  }: {
    amplificationParameter: string;
    balancesWithoutBPT: string[];
    currentPriceRates: string[];
    exemptedTokens: boolean[];
    lastInvariant: string;
    oldPriceRates: string[];
    protocolSwapFeePct: string;
    protocolYieldFeePct: string;
    virtualSupply: string;
  }): bigint => {
    const protocolFeePct = calculateSwapYieldFeePct(
      amplificationParameter,
      balancesWithoutBPT,
      currentPriceRates.map(BigInt),
      exemptedTokens,
      BigInt(lastInvariant),
      oldPriceRates.map(BigInt),
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
