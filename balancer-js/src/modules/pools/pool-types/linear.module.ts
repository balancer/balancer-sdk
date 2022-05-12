import { SubgraphPoolBase } from '@balancer-labs/sor';
import { LinearPoolLiquidity } from './concerns/linear/liquidity.concern';
import { LinearPoolSpotPrice } from './concerns/linear/spotPrice.concern';
import { PoolType } from './pool-type.interface';
import { BalancerError, BalancerErrorCode } from '@/balancerErrors';

export class Linear implements PoolType {
    constructor(
        public poolData?: SubgraphPoolBase,
        public liquidity = new LinearPoolLiquidity(),
        public spotPriceConcern = new LinearPoolSpotPrice()
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
