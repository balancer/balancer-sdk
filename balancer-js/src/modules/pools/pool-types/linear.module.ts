import { LinearPoolLiquidity } from './concerns/linear/liquidity.concern';
import { LinearPoolSpotPrice } from './concerns/linear/spotPrice.concern';
import { PoolType } from './pool-type.interface';

export class Linear implements PoolType {
    constructor(
        public liquidity = new LinearPoolLiquidity(),
        public spotPrice = new LinearPoolSpotPrice()
    ) {}
}
