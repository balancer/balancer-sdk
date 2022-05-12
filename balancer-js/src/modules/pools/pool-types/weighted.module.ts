import { SubgraphPoolBase } from '@balancer-labs/sor';
import { WeightedPoolLiquidity } from './concerns/weighted/liquidity.concern';
import { WeightedPoolSpotPrice } from './concerns/weighted/spotPrice.concern';
import { PoolType } from './pool-type.interface';
import { BalancerError, BalancerErrorCode } from '@/balancerErrors';

export class Weighted implements PoolType {
    constructor(
        public poolData?: SubgraphPoolBase,
        public liquidity = new WeightedPoolLiquidity(),
        public spotPriceConcern = new WeightedPoolSpotPrice()
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
