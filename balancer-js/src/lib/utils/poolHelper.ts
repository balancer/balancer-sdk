import { parseFixed } from '@ethersproject/bignumber';
import { AddressZero } from '@ethersproject/constants';
import { Pool } from '../../types';
import {
  SolidityMaths,
  _computeScalingFactor,
  _upscaleArray,
} from '@/lib/utils/solidityMaths';
import { AssetHelpers } from '@/lib/utils/assetHelpers';

export const AMP_PRECISION = 3; // number of decimals -> precision 1000

interface ParsedPoolInfo {
  bptIndex: number;
  exemptedTokens: boolean[];
  higherBalanceTokenIndex: number;
  lastJoinExitInvariant: string;
  parsedAmp: string;
  parsedBalances: string[];
  parsedBalancesWithoutBpt: string[];
  parsedDecimals: string[];
  parsedOldPriceRates: string[];
  parsedPriceRates: string[];
  parsedPriceRatesWithoutBpt: string[];
  parsedSwapFee: string;
  parsedTokens: string[];
  parsedTokensWithoutBpt: string[];
  parsedTotalShares: string;
  parsedWeights: string[];
  protocolSwapFeePct: string;
  protocolYieldFeePct: string;
  scalingFactors: bigint[];
  scalingFactorsWithoutBpt: bigint[];
  upScaledBalances: string[];
  upScaledBalancesWithoutBpt: string[];
  totalShares: string;
}

/**
 * Parse pool info into EVM amounts. Sorts by token order if wrappedNativeAsset param passed.
 * @param {Pool}  pool
 * @param {string}  wrappedNativeAsset
 * @param unwrapNativeAsset if true, changes wETH address to ETH address
 * @returns       parsed pool info
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const parsePoolInfo = (
  pool: Pool,
  wrappedNativeAsset?: string,
  unwrapNativeAsset?: boolean
): ParsedPoolInfo => {
  const defaultOne = '1000000000000000000';
  let exemptedTokens = pool.tokens.map(
    ({ isExemptFromYieldProtocolFee }) => !!isExemptFromYieldProtocolFee
  );
  let parsedTokens = unwrapNativeAsset
    ? pool.tokens.map((token) =>
        token.address === wrappedNativeAsset ? AddressZero : token.address
      )
    : pool.tokens.map((token) => token.address);
  let parsedDecimals = pool.tokens.map((token) => {
    return token.decimals ? token.decimals.toString() : '18';
  });
  let parsedBalances = pool.tokens.map((token) =>
    parseFixed(token.balance, token.decimals).toString()
  );
  let parsedWeights = pool.tokens.map((token) => {
    return token.weight ? parseFixed(token.weight, 18).toString() : defaultOne;
  });
  let parsedPriceRates = pool.tokens.map((token) => {
    return token.priceRate
      ? parseFixed(token.priceRate, 18).toString()
      : defaultOne;
  });

  let parsedOldPriceRates = pool.tokens.map(({ oldPriceRate }) => {
    return oldPriceRate ? parseFixed(oldPriceRate, 18).toString() : defaultOne;
  });

  const scalingFactorsRaw = parsedDecimals.map((decimals) =>
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    _computeScalingFactor(BigInt(decimals!))
  );
  let scalingFactors = scalingFactorsRaw.map((sf, i) =>
    SolidityMaths.mulDownFixed(sf, BigInt(parsedPriceRates[i]))
  );
  // This assumes token.balance is in human scale (e.g. from SG)
  let upScaledBalances = _upscaleArray(
    parsedBalances.map(BigInt),
    scalingFactors
  ).map((b) => b.toString());
  // let upScaledBalances = pool.tokens.map((token) =>
  //   parseFixed(token.balance, 18).toString()
  // );
  if (wrappedNativeAsset) {
    const assetHelpers = new AssetHelpers(wrappedNativeAsset);
    let sfString;
    [
      parsedTokens,
      parsedDecimals,
      sfString,
      parsedBalances,
      upScaledBalances,
      parsedWeights,
      parsedPriceRates,
      parsedOldPriceRates,
      exemptedTokens,
    ] = assetHelpers.sortTokens(
      parsedTokens,
      parsedDecimals,
      scalingFactors,
      parsedBalances,
      upScaledBalances,
      parsedWeights,
      parsedPriceRates,
      parsedOldPriceRates,
      exemptedTokens
    ) as [
      string[],
      string[],
      string[],
      string[],
      string[],
      string[],
      string[],
      string[],
      boolean[]
    ];
    scalingFactors = sfString.map(BigInt);
  }

  const parsedAmp = pool.amp
    ? parseFixed(pool.amp, AMP_PRECISION).toString() // Solidity maths uses precison method for amp that must be replicated
    : defaultOne;
  const parsedTotalShares = parseFixed(pool.totalShares, 18).toString();
  const parsedSwapFee = parseFixed(pool.swapFee, 18).toString();

  const higherBalanceTokenIndex = upScaledBalances
    .map(BigInt)
    .indexOf(SolidityMaths.max(...upScaledBalances.map(BigInt)));
  const protocolSwapFeePct = parseFixed(
    pool.protocolSwapFeeCache || '0',
    18
  ).toString();
  const protocolYieldFeePct = parseFixed(
    pool.protocolYieldFeeCache || '0',
    18
  ).toString();
  const scalingFactorsWithoutBpt: bigint[] = [],
    parsedTokensWithoutBpt: string[] = [],
    parsedBalancesWithoutBpt: string[] = [],
    parsedPriceRatesWithoutBpt: string[] = [],
    upScaledBalancesWithoutBpt: string[] = [];
  const bptIndex = parsedTokens.indexOf(pool.address);
  if (bptIndex !== -1) {
    scalingFactors.forEach((_, i) => {
      if (i !== bptIndex) {
        scalingFactorsWithoutBpt.push(scalingFactors[i]);
        parsedTokensWithoutBpt.push(parsedTokens[i]);
        parsedBalancesWithoutBpt.push(parsedBalances[i]);
        parsedPriceRatesWithoutBpt.push(parsedPriceRates[i]);
        upScaledBalancesWithoutBpt.push(upScaledBalances[i]);
      }
    });
  }
  const totalShares = parseFixed(pool.totalShares || '0', 18).toString();
  return {
    bptIndex,
    exemptedTokens,
    higherBalanceTokenIndex,
    lastJoinExitInvariant: pool.lastJoinExitInvariant || '0',
    parsedAmp,
    parsedBalances,
    parsedBalancesWithoutBpt,
    parsedDecimals,
    parsedOldPriceRates,
    parsedPriceRates,
    parsedPriceRatesWithoutBpt,
    parsedSwapFee,
    parsedTokens,
    parsedTokensWithoutBpt,
    parsedTotalShares,
    parsedWeights,
    protocolSwapFeePct,
    protocolYieldFeePct,
    scalingFactors,
    scalingFactorsWithoutBpt,
    upScaledBalances,
    upScaledBalancesWithoutBpt,
    totalShares,
  };
};
