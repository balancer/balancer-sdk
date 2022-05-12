import { SubgraphPoolBase } from '@balancer-labs/sor';
import { StablePhantomPoolLiquidity } from './concerns/stablePhantom/liquidity.concern';
import { StablePhantomPoolSpotPrice } from './concerns/stablePhantom/spotPrice.concern';
import { PoolType } from './pool-type.interface';
import { BalancerError, BalancerErrorCode } from '@/balancerErrors';

export class StablePhantom implements PoolType {
    constructor(
        public poolData?: SubgraphPoolBase,
        public liquidity = new StablePhantomPoolLiquidity(),
        public spotPriceConcern = new StablePhantomPoolSpotPrice()
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
