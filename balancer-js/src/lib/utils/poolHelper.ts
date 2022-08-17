import { parseFixed } from '@ethersproject/bignumber';
import { Pool } from '../../types';

const AMP_PRECISION = 3; // number of decimals -> precision 1000

/**
 * Parse pool info into EVM amounts
 * @param {Pool}  pool
 * @returns       parsed pool info
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const parsePoolInfo = (pool: Pool) => {
  const parsedTokens = pool.tokens.map((token) => token.address);
  const parsedDecimals = pool.tokens.map((token) => {
    return token.decimals ? token.decimals.toString() : undefined;
  });
  const parsedBalances = pool.tokens.map((token) =>
    parseFixed(token.balance, token.decimals).toString()
  );
  const parsedWeights = pool.tokens.map((token) => {
    return token.weight ? parseFixed(token.weight, 18).toString() : undefined;
  });
  const parsedPriceRates = pool.tokens.map((token) => {
    return token.priceRate
      ? parseFixed(token.priceRate, 18).toString()
      : undefined;
  });
  const parsedAmp = pool.amp
    ? parseFixed(pool.amp, AMP_PRECISION).toString() // Solidity maths uses precison method for amp that must be replicated
    : undefined;
  const parsedTotalShares = parseFixed(pool.totalShares, 18).toString();
  const parsedSwapFee = parseFixed(pool.swapFee, 18).toString();
  return {
    parsedTokens,
    parsedDecimals,
    parsedBalances,
    parsedWeights,
    parsedPriceRates,
    parsedAmp,
    parsedTotalShares,
    parsedSwapFee,
  };
};
