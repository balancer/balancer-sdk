import { Pool } from '@/types';
import { parsePoolInfo, replace } from '@/lib/utils';
import { calculateBalanceGivenInvariantAndAllOtherBalances } from '@/pool-stable/calculate-balance-given-invariant';
import { SolidityMaths } from '@/lib/utils/solidityMaths';

export default class StableProtocolFee {
  /**
   * Function that calculates the protocol fees for Stable V1+ and Meta Stable Pools
   * @param pool The pool to calculate the protocol fees
   */
  static calculateProtocolFees = (pool: Pool): bigint[] => {
    const protocolFeeAmount =
      StableProtocolFee.calDueTokenProtocolSwapFeeAmount(parsePoolInfo(pool));
    return protocolFeeAmount;
  };

  static calDueTokenProtocolSwapFeeAmount = ({
    parsedAmp,
    upScaledBalances,
    lastJoinExitInvariant,
    higherBalanceTokenIndex,
    protocolSwapFeePct,
  }: {
    parsedAmp: string;
    upScaledBalances: string[];
    lastJoinExitInvariant: string;
    higherBalanceTokenIndex: number;
    protocolSwapFeePct: string;
  }): bigint[] => {
    const dueTokenProtocolFeeAmounts = Array(upScaledBalances.length).fill(
      BigInt(0)
    );
    const finalBalanceFeeToken =
      calculateBalanceGivenInvariantAndAllOtherBalances({
        amplificationParameter: BigInt(parsedAmp),
        balances: upScaledBalances.map(BigInt),
        invariant: BigInt(lastJoinExitInvariant),
        tokenIndex: higherBalanceTokenIndex,
      });
    const higherBalance = BigInt(upScaledBalances[higherBalanceTokenIndex]);
    if (higherBalance < finalBalanceFeeToken) {
      // This shouldn't happen outside of rounding errors, but have this safeguard nonetheless to prevent the Pool
      // from entering a locked state in which joins and exits revert while computing accumulated swap fees.
      return dueTokenProtocolFeeAmounts;
    }
    const fees = SolidityMaths.sub(higherBalance, finalBalanceFeeToken);
    const higherBalanceFeeAmount = SolidityMaths.mulDownFixed(
      fees,
      BigInt(protocolSwapFeePct)
    );
    return replace(
      dueTokenProtocolFeeAmounts,
      higherBalanceTokenIndex,
      higherBalanceFeeAmount
    );
  };
}
