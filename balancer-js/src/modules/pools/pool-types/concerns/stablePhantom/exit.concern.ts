/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  ExitConcern,
  ExitExactBPTInParameters,
  ExitExactTokensOutParameters,
  ExitExactBPTInAttributes,
  ExitExactTokensOutAttributes,
} from '../types';

export class StablePhantomPoolExit implements ExitConcern {
  buildExitExactBPTIn = ({
    exiter,
    pool,
    bptIn,
    slippage,
    shouldUnwrapNativeAsset,
    wrappedNativeAsset,
    singleTokenOut,
    toInternalBalance,
  }: ExitExactBPTInParameters): ExitExactBPTInAttributes => {
    /**
     * Exit type only supported when pool is in paused state and pause window
     * has expired, so this type of exit will not be supported.
     */
    throw new Error('Exit type not supported');
  };

  buildExitExactTokensOut = ({
    exiter,
    pool,
    tokensOut,
    amountsOut,
    slippage,
    wrappedNativeAsset,
    toInternalBalance,
  }: ExitExactTokensOutParameters): ExitExactTokensOutAttributes => {
    throw new Error('Exit type not supported');
  };

  buildRecoveryExit = ({
    exiter,
    pool,
    bptIn,
    slippage,
    toInternalBalance,
  }: Pick<
    ExitExactBPTInParameters,
    'exiter' | 'pool' | 'bptIn' | 'slippage' | 'toInternalBalance'
  >): ExitExactBPTInAttributes => {
    throw new Error('Exit type not supported');
  };
}
