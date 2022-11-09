import { parseFixed } from '@ethersproject/bignumber';
import { Pool } from '../poolSource';

type PoolBalanceInput = { pool: Pool; tokens: string[] };

export function getPoolBalances(
  poolBalancesInput: PoolBalanceInput[]
): string[] {
  const balances: string[] = [];
  poolBalancesInput.forEach((ip) => {
    ip.tokens.forEach((t) => {
      if (ip.pool === undefined) return;

      const tokenIndex = ip.pool.tokens.findIndex(
        (pt) => pt.address.toLowerCase() === t.toLowerCase()
      );
      if (tokenIndex < 0) throw 'Pool does not contain tokenIn';
      balances.push(
        parseFixed(
          ip.pool.tokens[tokenIndex].balance,
          ip.pool.tokens[tokenIndex].decimals
        ).toString()
      );
    });
  });
  return balances;
}
