import { WeightedPoolLiquidity } from './concerns/weighted/liquidity.concern';
import { WeightedPoolSpotPrice } from './concerns/weighted/spotPrice.concern';
import { PoolType } from './pool-type.interface';
import { LiquidityConcern, SpotPriceConcern } from './concerns/types';
import { WeightedFactoryParams, WeightedFactoryAttributes, InitJoinAttributes, WeightedFactoryFormattedAttributes } from '../types';
import { Interface } from '@ethersproject/abi';
import { WeightedPoolFactory__factory } from '@balancer-labs/typechain';
import { BalancerSdkConfig } from '@/types';
import { BALANCER_NETWORK_CONFIG } from '@/lib/constants/config';

export class Weighted implements PoolType {
  public liquidityCalculator: LiquidityConcern;
  public spotPriceCalculator: SpotPriceConcern;
  factoryAddress: string;

  constructor(
    config: BalancerSdkConfig,
    private liquidityCalculatorConcern = WeightedPoolLiquidity,
    private spotPriceCalculatorConcern = WeightedPoolSpotPrice,
  ) {
    this.liquidityCalculator = new this.liquidityCalculatorConcern();
    this.spotPriceCalculator = new this.spotPriceCalculatorConcern();
    this.factoryAddress = typeof config.network === 'number' ?  
      BALANCER_NETWORK_CONFIG[config.network].addresses.contracts.poolFactories.weighted as string
      : config.network.addresses.contracts.poolFactories.weighted as string
  }

  async buildCreateTx(params: WeightedFactoryParams): Promise<WeightedFactoryAttributes> {
      const wPoolFactory = new Interface(WeightedPoolFactory__factory.abi)

      const attributes: WeightedFactoryFormattedAttributes = {
        name: params.name,
        symbol: params.symbol,
        tokens: params.seedTokens.map(token => token.tokenAddress),
        weights: params.seedTokens.map(token => token.weight),
        swapFeePercentage: params.initialFee,
        owner: params.owner,
      }

      const data = wPoolFactory.encodeFunctionData('create', Object.values(attributes))

      return { to: this.factoryAddress, data, functionName: 'create', attributes, err: false }
  }

  async buildInitJoin(initJoinParams: any): Promise<InitJoinAttributes>{
    return Promise.resolve({ to: '', data: "0x0", attributes: {}, functionName: 'initJoin' })
  }
}