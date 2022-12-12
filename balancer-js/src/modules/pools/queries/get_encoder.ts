import { WeightedPoolEncoder } from '@/pool-weighted/encoder';
import { StablePoolEncoder } from '@/pool-stable/encoder';
import { ComposableStablePoolEncoder } from '@/pool-composable-stable';
import { PoolType } from '@/types';

export const getEncoder = (
  poolType: PoolType
):
  | typeof WeightedPoolEncoder
  | typeof StablePoolEncoder
  | typeof ComposableStablePoolEncoder
  | undefined => {
  switch (poolType) {
    case PoolType.Weighted:
      return WeightedPoolEncoder;

    case PoolType.Stable:
    case PoolType.MetaStable:
    case PoolType.StablePhantom:
    case PoolType.AaveLinear:
    case PoolType.ERC4626Linear:
    case PoolType.Element:
    case PoolType.Gyro2:
    case PoolType.Gyro3:
      return StablePoolEncoder;

    case PoolType.ComposableStable:
      return ComposableStablePoolEncoder;

    default:
      break;
  }
};
