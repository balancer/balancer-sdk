import { SubgraphPoolBase } from '@balancer-labs/sor';
import { StablePoolLiquidity } from './concerns/stable/liquidity.concern';
import { StablePoolSpotPrice } from './concerns/stable/spotPrice.concern';
import { PoolType } from './pool-type.interface';
import { BalancerError, BalancerErrorCode } from '@/balancerErrors';

export class Stable implements PoolType {
    constructor(
        public poolData?: SubgraphPoolBase,
        public liquidity = new StablePoolLiquidity(),
        public spotPriceConcern = new StablePoolSpotPrice()
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
