import { Pool } from '@/types';
import { parsePoolInfoForProtocolFee } from '@/lib/utils';
import { calculateBalanceGivenInvariantAndAllOtherBalances } from '@/pool-stable/calculate-balance-given-invariant';
import { SolidityMaths } from '@/lib/utils/solidityMaths';

export default class StableProtocolFee {
  /**
   * Function that calculates the protocol fees for Stable V1+ and Meta Stable Pools
   * @param pool The pool to calculate the protocol fees
   */
  static calculateProtocolFees = (pool: Pool): bigint => {
    const protocolFeeAmount =
      StableProtocolFee.calDueTokenProtocolSwapFeeAmount(
        parsePoolInfoForProtocolFee(pool)
      );
    return protocolFeeAmount;
  };

  static calDueTokenProtocolSwapFeeAmount = ({
    amplificationParameter,
    balances,
    lastInvariant,
    higherBalanceTokenIndex,
    protocolSwapFeePct,
  }: {
    amplificationParameter: string;
    balances: string[];
    lastInvariant: string;
    higherBalanceTokenIndex: number;
    protocolSwapFeePct: string;
  }): bigint => {
    const finalBalanceFeeToken =
      calculateBalanceGivenInvariantAndAllOtherBalances({
        amplificationParameter: BigInt(amplificationParameter),
        balances: balances.map(BigInt),
        invariant: BigInt(lastInvariant),
        tokenIndex: higherBalanceTokenIndex,
      });
    const higherBalance = BigInt(balances[higherBalanceTokenIndex]);
    if (higherBalance < finalBalanceFeeToken) {
      // This shouldn't happen outside of rounding errors, but have this safeguard nonetheless to prevent the Pool
      // from entering a locked state in which joins and exits revert while computing accumulated swap fees.
      return BigInt(0);
    }
    const fees = SolidityMaths.sub(higherBalance, finalBalanceFeeToken);
    return SolidityMaths.mulDownFixed(fees, BigInt(protocolSwapFeePct));
  };
}
