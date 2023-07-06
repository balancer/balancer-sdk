import {
  JoinConcern,
  JoinPoolAttributes,
} from '@/modules/pools/pool-types/concerns/types';

export class GyroJoinConcern implements JoinConcern {
  buildJoin(): JoinPoolAttributes {
    throw new Error('GyroJoinConcern Not implemented');
  }
}
