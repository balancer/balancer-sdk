import {
  ExitConcern,
  ExitExactBPTInAttributes,
  ExitExactBPTInParameters,
  ExitExactTokensOutAttributes,
  ExitExactTokensOutParameters,
} from '@/modules/pools/pool-types/concerns/types';

export class FXExitConcern implements ExitConcern {
  // eslint-disable-line @typescript-eslint/no-unused-vars
  buildExitExactTokensOut({
    exiter,
    pool,
    tokensOut,
    amountsOut,
    slippage,
    wrappedNativeAsset,
  }: ExitExactTokensOutParameters): ExitExactTokensOutAttributes {
    throw new Error('FXExitConcern Not implemented');
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
