import { SubgraphPoolBase } from '@balancer-labs/sor';
import { MetaStablePoolLiquidity } from './concerns/metaStable/liquidity.concern';
import { MetaStablePoolSpotPrice } from './concerns/metaStable/spotPrice.concern';
import { PoolType } from './pool-type.interface';
import { BalancerError, BalancerErrorCode } from '@/balancerErrors';

export class MetaStable implements PoolType {
    constructor(
        public poolData?: SubgraphPoolBase,
        public liquidity = new MetaStablePoolLiquidity(),
        public spotPriceConcern = new MetaStablePoolSpotPrice()
    ) {}

    updateData(poolData: SubgraphPoolBase): void {
        this.poolData = poolData;
    }

    spotPrice(tokenIn: string, tokenOut: string): string {
        if (!this.poolData)
            throw new BalancerError(BalancerErrorCode.NO_POOL_DATA);

        return this.spotPriceConcern.calcPoolSpotPrice(
            tokenIn,
            tokenOut,
            this.poolData
        );
    }
}
