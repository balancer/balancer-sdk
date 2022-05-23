import { WeightedPoolLiquidity } from './concerns/weighted/liquidity.concern';
import { WeightedPoolSpotPrice } from './concerns/weighted/spotPrice.concern';
import { PoolType } from './pool-type.interface';
import { LiquidityConcern, SpotPriceConcern } from './concerns/types';

export class Weighted implements PoolType {
    public liquidity: LiquidityConcern;
    public spotPriceCalculator: SpotPriceConcern;

    constructor(
        private liquidityConcern = WeightedPoolLiquidity,
        private spotPriceCalculatorConcern = WeightedPoolSpotPrice
    ) {
        this.liquidity = new this.liquidityConcern();
        this.spotPriceCalculator = new this.spotPriceCalculatorConcern();
    }
}
