import {
  JoinConcern,
  JoinPoolAttributes,
} from '@/modules/pools/pool-types/concerns/types';

export class FXJoinConcern implements JoinConcern {
  buildJoin(): JoinPoolAttributes {
    throw new Error('FXJoinConcern Not implemented');
  }
}
