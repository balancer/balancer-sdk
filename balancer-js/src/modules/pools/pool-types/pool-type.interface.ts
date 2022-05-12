import { LiquidityConcern, SpotPriceConcern } from './concerns/types';

export interface PoolType {
    liquidity: LiquidityConcern;
    spotPrice: SpotPriceConcern;
}
