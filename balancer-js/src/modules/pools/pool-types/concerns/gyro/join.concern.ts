import {
  JoinConcern,
  JoinPoolAttributes,
  JoinPoolParameters,
} from '@/modules/pools/pool-types/concerns/types';

export class GyroJoinConcern implements JoinConcern {
  buildJoin({
    joiner,
    pool,
    tokensIn,
    amountsIn,
    slippage,
    wrappedNativeAsset,
  }: JoinPoolParameters): JoinPoolAttributes {
    throw new Error('GyroJoinConcern Not implemented');
  }
}
