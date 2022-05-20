import { WeightedPoolLiquidity } from './concerns/weighted/liquidity.concern';
import { WeightedPoolSpotPrice } from './concerns/weighted/spotPrice.concern';
import { WeighedPoolJoin } from './concerns/weighted/join.concern';
import { PoolType } from './pool-type.interface';
import {
    JoinConcern,
    LiquidityConcern,
    SpotPriceConcern,
} from './concerns/types';

export class Weighted implements PoolType {
    public liquidityCalculator: LiquidityConcern;
    public spotPriceCalculator: SpotPriceConcern;
    public joinCalculator: JoinConcern;

    constructor(
        private liquidityCalculatorConcern = WeightedPoolLiquidity,
        private spotPriceCalculatorConcern = WeightedPoolSpotPrice,
        private joinCalculatorConcern = WeighedPoolJoin
    ) {
        this.liquidityCalculator = new this.liquidityCalculatorConcern();
        this.spotPriceCalculator = new this.spotPriceCalculatorConcern();
        this.joinCalculator = new this.joinCalculatorConcern();
    }
}
