import { BytesLike } from '@ethersproject/bytes';
import {
  ComposableStableCreatePoolParameters,
  InitJoinPoolAttributes,
  InitJoinPoolParameters,
  WeightedCreatePoolParameters,
} from '@/modules/pools/factory/types';

export interface PoolFactory {
  create(
    parameters:
      | ComposableStableCreatePoolParameters
      | WeightedCreatePoolParameters
  ): {
    to: string;
    data: BytesLike;
  };
  buildInitJoin: (parameters: InitJoinPoolParameters) => InitJoinPoolAttributes;
}
