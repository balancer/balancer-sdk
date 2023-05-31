import { BytesLike } from '@ethersproject/bytes';
import {
  ComposableStableCreatePoolParameters,
  InitJoinPoolAttributes,
  InitJoinPoolParameters,
  LinearCreatePoolParameters,
  LinearPoolInterface,
  WeightedCreatePoolParameters,
} from '@/modules/pools/factory/types';
import { JsonRpcProvider, TransactionReceipt } from '@ethersproject/providers';
import { WeightedPoolInterface } from '@/contracts/WeightedPool';
import { ComposableStablePoolInterface } from '@/contracts/ComposableStablePool';

export interface PoolFactory {
  buildInitJoin: (parameters: InitJoinPoolParameters) => InitJoinPoolAttributes;
  getPoolAddressAndIdWithReceipt: (
    provider: JsonRpcProvider,
    receipt: TransactionReceipt
  ) => Promise<{ poolId: string; poolAddress: string }>;

  create(
    parameters:
      | ComposableStableCreatePoolParameters
      | WeightedCreatePoolParameters
      | LinearCreatePoolParameters
  ): {
    to?: string;
    data: BytesLike;
  };

  getPoolInterface():
    | WeightedPoolInterface
    | ComposableStablePoolInterface
    | LinearPoolInterface;
}
