import { parseFixed } from '@ethersproject/bignumber';
import { PoolBase } from '@balancer-labs/sor';

type PoolBalanceInput = { pool: PoolBase; tokens: string[] };

export function getPoolBalances(
  poolBalancesInput: PoolBalanceInput[]
): string[] {
  const balances: string[] = [];
  poolBalancesInput.forEach((ip) => {
    ip.tokens.forEach((t) => {
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
