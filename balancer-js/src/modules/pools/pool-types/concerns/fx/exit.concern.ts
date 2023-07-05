import {
  ExitConcern,
  ExitExactBPTInAttributes,
  ExitExactTokensOutAttributes,
} from '@/modules/pools/pool-types/concerns/types';

export class FXExitConcern implements ExitConcern {
  buildExitExactTokensOut(): ExitExactTokensOutAttributes {
    throw new Error('FXExitConcern Not implemented');
  }

  buildRecoveryExit(): ExitExactBPTInAttributes {
    throw new Error('FXExitConcern Not implemented');
  }
}
