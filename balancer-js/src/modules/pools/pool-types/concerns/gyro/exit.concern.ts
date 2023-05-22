import {
  ExitConcern,
  ExitExactBPTInAttributes,
  ExitExactBPTInParameters,
  ExitExactTokensOutAttributes,
  ExitExactTokensOutParameters,
} from '@/modules/pools/pool-types/concerns/types';

export class GyroExitConcern implements ExitConcern {
  buildExitExactTokensOut({
    exiter,
    pool,
    tokensOut,
    amountsOut,
    slippage,
    wrappedNativeAsset,
  }: ExitExactTokensOutParameters): ExitExactTokensOutAttributes {
    console.log(
      exiter,
      pool,
      tokensOut,
      amountsOut,
      slippage,
      wrappedNativeAsset
    );
    throw new Error('Not implemented');
  }

  buildRecoveryExit({
    exiter,
    pool,
    bptIn,
    slippage,
  }: Pick<
    ExitExactBPTInParameters,
    'exiter' | 'pool' | 'bptIn' | 'slippage'
  >): ExitExactBPTInAttributes {
    console.log(exiter, pool, bptIn, slippage);
    throw new Error('Not implemented');
  }
}
