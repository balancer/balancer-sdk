import { ONE, SolidityMaths } from '@/lib/utils/solidityMaths';

export const calcDueTokenProtocolSwapFeeAmount = (
  balance: bigint,
  normalizedWeight: bigint,
  lastInvariant: bigint,
  currentInvariant: bigint,
  protocolSwapFeePct: bigint
): bigint => {
  /*********************************************************************************
   /*  protocolFeeAmount = protocolSwapFeePercentage * balanceToken * ( 1 - (previousInvariant / currentInvariant) ^ (1 / weightToken))
   *********************************************************************************/
  if (currentInvariant < lastInvariant) {
    return BigInt(0);
  }
  // We round down to prevent issues in the Pool's accounting, even if it means paying slightly less in protocol
  // fees to the Vault.
  // Fee percentage and balance multiplications round down, while the subtrahend (power) rounds up (as does the
  // base). Because previousInvariant / currentInvariant <= 1, the exponent rounds down.
  let base = SolidityMaths.divUpFixed(lastInvariant, currentInvariant);
  const exponent = SolidityMaths.divDownFixed(ONE, normalizedWeight);
  // Because the exponent is larger than one, the base of the power function has a lower bound. We cap to this
  // value to avoid numeric issues, which means in the extreme case (where the invariant growth is larger than
  // 1 / min exponent) the Pool will pay less in protocol fees than it should.
  base = SolidityMaths.max(base, SolidityMaths.MIN_POW_BASE_FREE_EXPONENT);

  const power = SolidityMaths.powUpFixed(base, exponent);
  const tokenAccruedFees = SolidityMaths.mulDownFixed(
    balance,
    SolidityMaths.complementFixed(power)
  );
  return SolidityMaths.mulDownFixed(tokenAccruedFees, protocolSwapFeePct);
};
