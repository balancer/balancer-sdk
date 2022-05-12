import { SubgraphPoolBase } from '@balancer-labs/sor';
import { LiquidityConcern, SpotPriceConcern } from './concerns/types';

export interface PoolType {
    liquidity: LiquidityConcern;
    spotPriceConcern: SpotPriceConcern;
    updateData: (poolData: SubgraphPoolBase) => void;
    spotPrice: (tokenIn: string, tokenOut: string) => string;
}
