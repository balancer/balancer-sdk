import {
  ExitConcern,
  ExitExactBPTInParameters,
  ExitExactTokensOutParameters,
  ExitPoolAttributes,
} from '../types';

export class StablePhantomPoolExit implements ExitConcern {
  buildExitExactBPTIn = ({
    exiter,
    pool,
    bptIn,
    slippage,
    shouldUnwrapNativeAsset,
    wrappedNativeAsset,
    singleTokenMaxOut,
  }: ExitExactBPTInParameters): ExitPoolAttributes => {
    // TODO implementation
    console.log(
      exiter,
      pool,
      bptIn,
      slippage,
      shouldUnwrapNativeAsset,
      wrappedNativeAsset,
      singleTokenMaxOut
    );
    throw new Error('To be implemented');
  };

  buildExitExactTokensOut = ({
    exiter,
    pool,
    tokensOut,
    amountsOut,
    slippage,
    wrappedNativeAsset,
  }: ExitExactTokensOutParameters): ExitPoolAttributes => {
    // TODO implementation
    console.log(
      exiter,
      pool,
      tokensOut,
      amountsOut,
      slippage,
      wrappedNativeAsset
    );
    throw new Error('To be implemented');
  };
}
