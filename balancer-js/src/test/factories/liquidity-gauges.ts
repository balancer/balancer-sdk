import { Factory } from 'fishery';
import { LiquidityGauge, RewardData } from '@/types';

export const gaugesFactory = Factory.define<LiquidityGauge>(({ params }) => {
  return {
    id: params.id || '1',
    address: params.address || '1',
    name: params.name || 'gauge',
    poolId: params.poolId || '1',
    poolAddress: params.poolAddress || '1',
    totalSupply: params.totalSupply || 1,
    workingSupply: params.workingSupply || 1,
    relativeWeight: params.relativeWeight || 1,
    rewardTokens:
      (params.rewardTokens as { [tokenAddress: string]: RewardData }) || [],
  };
});
