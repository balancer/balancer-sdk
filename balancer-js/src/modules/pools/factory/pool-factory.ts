import { BytesLike } from '@ethersproject/bytes';
import {
  ComposableStableCreatePoolParameters,
  InitJoinPoolAttributes,
  InitJoinPoolParameters,
  WeightedCreatePoolParameters,
} from '@/modules/pools/factory/types';
import { JsonRpcProvider, TransactionReceipt } from '@ethersproject/providers';

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
  ): {
    to?: string;
    data: BytesLike;
  };
}
