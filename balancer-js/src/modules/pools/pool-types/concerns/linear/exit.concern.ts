import {
  ExitConcern,
  ExitExactBPTInParameters,
  ExitExactTokensOutParameters,
  ExitExactBPTInAttributes,
  ExitExactTokensOutAttributes,
} from '../types';

export class LinearPoolExit implements ExitConcern {
  buildExitExactBPTIn = ({
    exiter,
    pool,
    bptIn,
    slippage,
    shouldUnwrapNativeAsset,
    wrappedNativeAsset,
    singleTokenMaxOut,
  }: ExitExactBPTInParameters): ExitExactBPTInAttributes => {
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
  }: ExitExactTokensOutParameters): ExitExactTokensOutAttributes => {
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
