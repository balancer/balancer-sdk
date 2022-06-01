import { ExactTokensInJoinPoolParameters, JoinConcern } from '../types';

export class StablePoolJoin implements JoinConcern {
  async encodedExactTokensInJoinPool({
    joiner,
    pool,
    tokensIn,
    amountsIn,
    slippage,
  }: ExactTokensInJoinPoolParameters): Promise<string> {
    // TODO implementation
    console.log(joiner, pool, tokensIn, amountsIn, slippage);
    throw new Error('To be implemented');
  }
}
