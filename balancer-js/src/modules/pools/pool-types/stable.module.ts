import { StablePoolLiquidity } from './concerns/stable/liquidity.concern';
import { StablePoolSpotPrice } from './concerns/stable/spotPrice.concern';
import { PoolType } from './pool-type.interface';

export class Stable implements PoolType {
    constructor(
        public liquidity = new StablePoolLiquidity(),
        public spotPrice = new StablePoolSpotPrice()
    ) {}
}
