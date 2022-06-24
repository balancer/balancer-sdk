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
    wrappedNativeAsset,
  }: ExactTokensInJoinPoolParameters): Promise<JoinPoolAttributes> {
    // TODO implementation
    console.log(
      joiner,
      pool,
      tokensIn,
      amountsIn,
      slippage,
      wrappedNativeAsset
    );
    throw new Error('To be implemented');
  }
}
