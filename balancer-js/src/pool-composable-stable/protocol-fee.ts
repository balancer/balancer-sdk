import { Pool } from '@/types';
import { calculateSwapYieldFeePct } from '@/pool-composable-stable/calculate-swap-yield-fee-pct';
import { SolidityMaths } from '@/lib/utils/solidityMaths';
import { parsePoolInfo } from '@/lib/utils';
import { ComposableStablePool__factory } from '@/contracts';
import { JsonRpcProvider } from '@ethersproject/providers';

export default class ComposableStableProtocolFee {
  static calculateProtocolFees(pool: Pool): bigint {
    const parsedPool = parsePoolInfo(pool);
    const protocolFeeAmount =
      ComposableStableProtocolFee.calDueBPTProtocolFeeAmount(parsedPool);
    return protocolFeeAmount;
  }

  static async calculateProtocolFeesV4(
    pool: Pool,
    provider: JsonRpcProvider
  ): Promise<bigint> {
    if (pool.poolTypeVersion < 4) throw new Error('Pool is not V4 or higher');
    const parsedPool = parsePoolInfo(pool);
    const poolContract = ComposableStablePool__factory.connect(
      pool.address,
      provider
    );
    const priceRateCache: { priceRates: bigint[]; oldPriceRates: bigint[] } = {
      priceRates: [],
      oldPriceRates: [],
    };
    await Promise.all(
      pool.tokensList.map(async (tokenAddress) => {
        const [priceRate, oldPriceRate] = await poolContract.getTokenRateCache(
          tokenAddress
        );
        priceRateCache.priceRates.push(priceRate.toBigInt());
        priceRateCache.oldPriceRates.push(oldPriceRate.toBigInt());
      })
    );
    const [lastJoinExitAmplification, lastJoinExitInvariant] =
      await poolContract.getLastJoinExitData();
    const protocolFeeAmount =
      ComposableStableProtocolFee.calDueBPTProtocolFeeAmount({
        ...parsedPool,
        priceRates: priceRateCache.priceRates,
        oldPriceRates: priceRateCache.oldPriceRates,
        lastPostJoinExitInvariant: lastJoinExitInvariant.toBigInt(),
        ampWithPrecision: lastJoinExitAmplification.toBigInt(),
      });
    return protocolFeeAmount;
  }

  static calDueBPTProtocolFeeAmount = ({
    ampWithPrecision,
    upScaledBalancesWithoutBpt,
    priceRates,
    exemptedTokens,
    lastPostJoinExitInvariant,
    oldPriceRates,
    protocolSwapFeePct,
    protocolYieldFeePct,
    totalSharesEvm,
  }: {
    ampWithPrecision: bigint;
    upScaledBalancesWithoutBpt: bigint[];
    priceRates: bigint[];
    exemptedTokens: boolean[];
    lastPostJoinExitInvariant: bigint;
    oldPriceRates: bigint[];
    protocolSwapFeePct: bigint;
    protocolYieldFeePct: bigint;
    totalSharesEvm: bigint;
  }): bigint => {
    const protocolFeePct = calculateSwapYieldFeePct(
      ampWithPrecision,
      upScaledBalancesWithoutBpt,
      priceRates,
      exemptedTokens,
      lastPostJoinExitInvariant,
      oldPriceRates,
      protocolSwapFeePct,
      protocolYieldFeePct
    );

    // Since this fee amount will be minted as BPT, which increases the total supply, we need to mint
    // slightly more so that it reflects this percentage of the total supply after minting.
    //
    // The percentage of the Pool the protocol will own after minting is given by:
    // `protocol percentage = to mint / (current supply + to mint)`.
    // Solving for `to mint`, we arrive at:
    // `to mint = current supply * protocol percentage / (1 - protocol percentage)`.
    const bptProtocolFeeAmount = SolidityMaths.divDownFixed(
      SolidityMaths.mulDownFixed(totalSharesEvm, protocolFeePct),
      SolidityMaths.complementFixed(protocolFeePct)
    );
    return bptProtocolFeeAmount;
  };
}
