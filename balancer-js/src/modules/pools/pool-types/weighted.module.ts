import { WeightedPoolLiquidity } from './concerns/weighted/liquidity.concern';
import { WeightedPoolSpotPrice } from './concerns/weighted/spotPrice.concern';
import { PoolType } from './pool-type.interface';

export class Weighted implements PoolType {
    constructor(
        public liquidity = new WeightedPoolLiquidity(),
        public spotPrice = new WeightedPoolSpotPrice()
    ) {}
}
