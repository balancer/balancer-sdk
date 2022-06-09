import {
  ExitConcern,
  ExitExactBPTInForTokensOutParameters,
  ExitPoolAttributes,
} from '../types';

export class StablePhantomPoolExit implements ExitConcern {
  async buildExitExactBPTInForTokensOut({
    exiter,
    pool,
    bptIn,
    slippage,
  }: ExitExactBPTInForTokensOutParameters): Promise<ExitPoolAttributes> {
    // TODO implementation
    console.log(exiter, pool, bptIn, slippage);
    throw new Error('To be implemented');
  }
}
