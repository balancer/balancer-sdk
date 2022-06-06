import {
  ExactTokensInJoinPoolParameters,
  JoinConcern,
  JoinPoolAttributes,
} from '../types';

export class LinearPoolJoin implements JoinConcern {
  async buildExactTokensInJoinPool({
    joiner,
    pool,
    tokensIn,
    amountsIn,
    slippage,
  }: ExactTokensInJoinPoolParameters): Promise<JoinPoolAttributes> {
    // TODO implementation
    console.log(joiner, pool, tokensIn, amountsIn, slippage);
    throw new Error('To be implemented');
  }
}
