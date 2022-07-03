import { WeightedPoolLiquidity } from './concerns/weighted/liquidity.concern';
import { WeightedPoolSpotPrice } from './concerns/weighted/spotPrice.concern';
import { PoolType } from './pool-type.interface';
import { LiquidityConcern, SpotPriceConcern } from './concerns/types';
import { WeightedFactoryParams, WeightedFactoryAttributes, InitJoinAttributes, WeightedFactoryFormattedAttributes } from '../types';
import { Interface } from '@ethersproject/abi';
import { WeightedPoolFactory__factory } from '@balancer-labs/typechain';
import { BalancerSdkConfig } from '@/types';
import { poolFactoryAddresses } from '@/lib/constants/config';
import { ethers } from 'ethers';

export class Weighted implements PoolType {
  public liquidityCalculator: LiquidityConcern;
  public spotPriceCalculator: SpotPriceConcern;

  constructor(
    config: BalancerSdkConfig,
    private liquidityCalculatorConcern = WeightedPoolLiquidity,
    private spotPriceCalculatorConcern = WeightedPoolSpotPrice,
  ) {
    this.liquidityCalculator = new this.liquidityCalculatorConcern();
    this.spotPriceCalculator = new this.spotPriceCalculatorConcern();
  }

  async buildCreateTx(params: WeightedFactoryParams): Promise<WeightedFactoryAttributes> {
      const wPoolFactory = new Interface(WeightedPoolFactory__factory.abi)

      const attributes: WeightedFactoryFormattedAttributes = {
        name: params.name,
        symbol: params.symbol,
        tokens: params.seedTokens.map(token => token.tokenAddress),
        weights: params.seedTokens.map(token => token.weight),
        swapFeePercentage: ethers.utils.parseEther(params.initialFee),
        owner: params.owner,
      }

      const data = wPoolFactory.encodeFunctionData('create', Object.values(attributes))

      return { 
        to: poolFactoryAddresses.weighted,
        data, functionName: 'create',
        attributes, err: false,
        value: ethers.utils.parseEther(params.value)
      }
  }

  async buildInitJoin(initJoinParams: any): Promise<InitJoinAttributes>{
    return Promise.resolve({ to: '', data: "0x0", attributes: {}, functionName: 'initJoin' })
  }
}