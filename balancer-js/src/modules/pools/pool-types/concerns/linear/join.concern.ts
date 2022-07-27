import { JoinPoolParameters, JoinConcern, JoinPoolAttributes } from '../types';

export class LinearPoolJoin implements JoinConcern {
  async buildJoin({
    joiner,
    pool,
    tokensIn,
    amountsIn,
    slippage,
    wrappedNativeAsset,
  }: JoinPoolParameters): Promise<JoinPoolAttributes> {
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
