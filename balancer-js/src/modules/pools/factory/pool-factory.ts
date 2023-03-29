import { BytesLike } from '@ethersproject/bytes';
import {
  ComposableStableCreatePoolParameters,
  InitJoinPoolAttributes,
  InitJoinPoolParameters,
  LinearCreatePoolParameters,
  WeightedCreatePoolParameters,
} from '@/modules/pools/factory/types';
import { JsonRpcProvider, TransactionReceipt } from '@ethersproject/providers';
import { WeightedPoolInterface } from '@/contracts/WeightedPool';
import { ComposableStableInterface } from '@/contracts/ComposableStable';
import { ERC4626LinearPoolInterface } from '@/contracts/ERC4626LinearPool';
import { EulerLinearPoolInterface } from '@/contracts/EulerLinearPool';
import { AaveLinearPoolInterface } from '@/contracts/AaveLinearPool';
import { YearnLinearPoolInterface } from '@/contracts/YearnLinearPool';

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
    | ComposableStableInterface
    | ERC4626LinearPoolInterface
    | EulerLinearPoolInterface
    | AaveLinearPoolInterface
    | YearnLinearPoolInterface;
}
