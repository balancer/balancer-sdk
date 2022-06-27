import {
  ExactTokensInJoinPoolParameters,
  JoinConcern,
  JoinPoolAttributes,
} from '../types';

export class MetaStablePoolJoin implements JoinConcern {
  async buildJoin({
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
