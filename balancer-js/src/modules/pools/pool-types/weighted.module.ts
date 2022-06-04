import { WeightedPoolLiquidity } from './concerns/weighted/liquidity.concern';
import { WeightedPoolSpotPrice } from './concerns/weighted/spotPrice.concern';
import { PoolType } from './pool-type.interface';
import { LiquidityConcern, SpotPriceConcern } from './concerns/types';
import { WeightedFactoryParams, WeightedFactoryCreationInfo } from '../types';

export class Weighted implements PoolType {
  public liquidityCalculator: LiquidityConcern;
  public spotPriceCalculator: SpotPriceConcern;

  constructor(
    private liquidityCalculatorConcern = WeightedPoolLiquidity,
    private spotPriceCalculatorConcern = WeightedPoolSpotPrice
  ) {
    this.liquidityCalculator = new this.liquidityCalculatorConcern();
    this.spotPriceCalculator = new this.spotPriceCalculatorConcern();
  }

  async getCreationTxParams(params: WeightedFactoryParams): Promise<WeightedFactoryCreationInfo> {
      throw new Error('Method not implemented.');
  }
}
