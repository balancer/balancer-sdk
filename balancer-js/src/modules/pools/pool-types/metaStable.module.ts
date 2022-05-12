import { MetaStablePoolLiquidity } from './concerns/metaStable/liquidity.concern';
import { MetaStablePoolSpotPrice } from './concerns/metaStable/spotPrice.concern';
import { PoolType } from './pool-type.interface';

export class MetaStable implements PoolType {
    constructor(
        public liquidity = new MetaStablePoolLiquidity(),
        public spotPrice = new MetaStablePoolSpotPrice()
    ) {}
}
