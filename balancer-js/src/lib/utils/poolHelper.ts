import { parseFixed } from '@ethersproject/bignumber';
import { Pool } from '../../types';
import { _computeScalingFactor } from '@/lib/utils/solidityMaths';
import { AssetHelpers } from './assetHelpers';

const AMP_PRECISION = 3; // number of decimals -> precision 1000

/**
 * Parse pool info into EVM amounts. Sorts by token order if wrappedNativeAsset param passed.
 * @param {Pool}  pool
 * @param {string}  wrappedNativeAsset
 * @returns       parsed pool info
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const parsePoolInfo = (pool: Pool, wrappedNativeAsset?: string) => {
  let parsedTokens = pool.tokens.map((token) => token.address);
  let parsedDecimals = pool.tokens.map((token) => {
    return token.decimals ? token.decimals.toString() : undefined;
  });
  let scalingFactors = parsedDecimals.map((decimals) =>
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    _computeScalingFactor(BigInt(decimals!))
  );
  let parsedBalances = pool.tokens.map((token) =>
    parseFixed(token.balance, token.decimals).toString()
  );
  // This assumes token.balance is in human scale (e.g. from SG)
  let upScaledBalances = pool.tokens.map((token) =>
    parseFixed(token.balance, 18).toString()
  );
  let parsedWeights = pool.tokens.map((token) => {
    return token.weight ? parseFixed(token.weight, 18).toString() : undefined;
  });
  let parsedPriceRates = pool.tokens.map((token) => {
    return token.priceRate
      ? parseFixed(token.priceRate, 18).toString()
      : undefined;
  });

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
    ] = assetHelpers.sortTokens(
      parsedTokens,
      parsedDecimals,
      scalingFactors,
      parsedBalances,
      upScaledBalances,
      parsedWeights,
      parsedPriceRates
    ) as [string[], string[], string[], string[], string[], string[], string[]];
    scalingFactors = sfString.map(BigInt);
  }

  const parsedAmp = pool.amp
    ? parseFixed(pool.amp, AMP_PRECISION).toString() // Solidity maths uses precison method for amp that must be replicated
    : undefined;
  const parsedTotalShares = parseFixed(pool.totalShares, 18).toString();
  const parsedSwapFee = parseFixed(pool.swapFee, 18).toString();

  const scalingFactorsWithoutBpt: bigint[] = [],
    parsedTokensWithoutBpt: string[] = [],
    parsedBalancesWithoutBpt: string[] = [];
  const bptIndex = parsedTokens.indexOf(pool.address);
  if (bptIndex !== -1) {
    scalingFactors.forEach((_, i) => {
      if (i !== bptIndex) {
        scalingFactorsWithoutBpt.push(scalingFactors[i]);
        parsedTokensWithoutBpt.push(parsedTokens[i]);
        parsedBalancesWithoutBpt.push(parsedBalances[i]);
      }
    });
  }

  return {
    parsedTokens,
    parsedDecimals,
    parsedBalances,
    parsedWeights,
    parsedPriceRates,
    parsedAmp,
    parsedTotalShares,
    parsedSwapFee,
    upScaledBalances,
    scalingFactors,
    scalingFactorsWithoutBpt,
    parsedTokensWithoutBpt,
    parsedBalancesWithoutBpt,
    bptIndex,
  };
};
