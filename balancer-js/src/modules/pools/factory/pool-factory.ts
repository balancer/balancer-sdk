// import { InitJoinPoolAttributes, InitJoinPoolParameters } from './types';
import { TransactionRequest } from '@ethersproject/providers';
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
  ): TransactionRequest;
  buildInitJoin: (parameters: InitJoinPoolParameters) => InitJoinPoolAttributes;
}
