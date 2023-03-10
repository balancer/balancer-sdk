// import { InitJoinPoolAttributes, InitJoinPoolParameters } from './types';
import { TransactionRequest } from '@ethersproject/providers';
import {
  ComposableStableCreatePoolParameters,
  InitJoinPoolAttributes,
  InitJoinPoolParameters,
  LinearCreatePoolParameters,
  WeightedCreatePoolParameters,
} from '@/modules/pools/factory/types';

export interface PoolFactory {
  buildInitJoin: (parameters: InitJoinPoolParameters) => InitJoinPoolAttributes;

  create(
    parameters:
      | ComposableStableCreatePoolParameters
      | WeightedCreatePoolParameters
      | LinearCreatePoolParameters
  ): TransactionRequest;
}
