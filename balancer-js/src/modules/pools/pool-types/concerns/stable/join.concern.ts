import { JoinPoolParameters, JoinConcern, JoinPoolAttributes } from '../types';

export class StablePoolJoin implements JoinConcern {
  buildJoin = ({
    joiner,
    pool,
    tokensIn,
    amountsIn,
    slippage,
    wrappedNativeAsset,
    // TODO implementation
    console.log(
      joiner,
      pool,
  }: JoinPoolParameters): JoinPoolAttributes => {
      tokensIn,
      amountsIn,
      slippage,
      wrappedNativeAsset
    );
    throw new Error('To be implemented');
  };
}
