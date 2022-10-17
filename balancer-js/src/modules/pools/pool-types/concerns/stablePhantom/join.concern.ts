import {
  JoinPoolParameters,
  JoinConcern,
  JoinPoolAttributes,
  InitJoinPoolAttributes,
  InitJoinPoolParameters,
} from '../types';

export class StablePhantomPoolJoin implements JoinConcern {
  buildJoin = ({
    joiner,
    pool,
    tokensIn,
    amountsIn,
    slippage,
    wrappedNativeAsset,
  }: JoinPoolParameters): JoinPoolAttributes => {
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
  };

  buildInitJoin({
    joiner,
    pool,
    tokensIn,
    amountsIn,
    wrappedNativeAsset,
  }: InitJoinPoolParameters): InitJoinPoolAttributes {
    console.log(joiner, pool, tokensIn, amountsIn, wrappedNativeAsset);
    throw new Error('To be implemented');
  }
}
