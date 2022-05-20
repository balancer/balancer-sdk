import { StablePoolLiquidity } from './concerns/stable/liquidity.concern';
import { StablePoolSpotPrice } from './concerns/stable/spotPrice.concern';
import { PoolType } from './pool-type.interface';
import {
    JoinConcern,
    LiquidityConcern,
    SpotPriceConcern,
} from './concerns/types';
import { StablePoolJoin } from './concerns/stable/join.concern';

export class Stable implements PoolType {
    public liquidityCalculator: LiquidityConcern;
    public spotPriceCalculator: SpotPriceConcern;
    public joinCalculator: JoinConcern;

    constructor(
        private liquidityCalculatorConcern = StablePoolLiquidity,
        private spotPriceCalculatorConcern = StablePoolSpotPrice,
        private joinCalculatorConcern = StablePoolJoin
    ) {
        this.liquidityCalculator = new this.liquidityCalculatorConcern();
        this.spotPriceCalculator = new this.spotPriceCalculatorConcern();
        this.joinCalculator = new this.joinCalculatorConcern();
    }
}
