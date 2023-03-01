import { parseUnits } from '@ethersproject/units';
import { BigNumber } from '@ethersproject/bignumber';

/**
 * Calculates the proportional amounts of tokens in relation to a given token and amount.
 * Useful for calculating the amounts of tokens to be sent to a pool when joining or swapping.
 * When using proportional amounts to join a pool the price impact will be minimal.
 *
 * ```js
 * const pool = {
 *   id: '0x0000',
 *   tokens: [
 *     { address: '0x1234', balance: '10' },
 *     { address: '0x5678', balance: '20' }
 *   ]
 * }
 *
 * const { tokens, amounts } = proportionalAmounts(pool, '0x1234', '1000000000000000000')
 * ```
 */
export const proportionalAmounts = (
  /** Pool object */
  pool: {
    /** Pool ID */
    id: string;
    /** List of pool tokens */
    tokens: { address: string; balance: string; decimals?: number }[];
  },
  /** Token address in relation to which the amounts are calculated */
  token: string,
  /** Amount of token */
  amount: string
): {
  /** list of tokens */
  tokens: string[];
  /** list of amounts */
  amounts: string[];
} => {
  const tokensWithoutBpt = pool.tokens.filter(
    (t) => !pool.id.toLowerCase().includes(t.address.toLowerCase())
  );
  const referenceTokenIndex = tokensWithoutBpt.findIndex(
    (t) => t.address.toLowerCase() === token.toLowerCase()
  );

  if (referenceTokenIndex == -1) {
    throw new Error('Token not found in pool');
  }

  const balances = tokensWithoutBpt.map((t) =>
    parseUnits(t.balance, t.decimals)
  );
  const amountBn = BigNumber.from(amount);
  const proportionalAmounts = balances.map((b) =>
    b.mul(amountBn).div(balances[referenceTokenIndex])
  );

  return {
    tokens: tokensWithoutBpt.map((t) => t.address),
    amounts: proportionalAmounts.map((a) => a.toString()),
  };
};
