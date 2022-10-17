import {
  JoinPoolParameters,
  JoinConcern,
  JoinPoolAttributes,
  InitJoinPoolAttributes,
} from '../types';

export class LinearPoolJoin implements JoinConcern {
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
  buildInitJoin = ({
    joiner,
    pool,
    tokensIn,
    amountsIn,
    wrappedNativeAsset,
  }: JoinPoolParameters): InitJoinPoolAttributes => {
    console.log(joiner, pool, tokensIn, amountsIn, wrappedNativeAsset);
    throw new Error('To be implemented');
  };
}
