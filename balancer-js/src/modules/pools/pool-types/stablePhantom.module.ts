import { StablePhantomPoolLiquidity } from './concerns/stablePhantom/liquidity.concern';
import { StablePhantomPoolSpotPrice } from './concerns/stablePhantom/spotPrice.concern';
import { PoolType } from './pool-type.interface';

export class StablePhantom implements PoolType {
    constructor(
        public liquidity = new StablePhantomPoolLiquidity(),
        public spotPrice = new StablePhantomPoolSpotPrice()
    ) {}
}
