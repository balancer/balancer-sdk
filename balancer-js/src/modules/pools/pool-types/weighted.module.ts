import { WeightedPoolLiquidity } from './concerns/weighted/liquidity.concern';
import { WeightedPoolSpotPrice } from './concerns/weighted/spotPrice.concern';
import { PoolType } from './pool-type.interface';
import { LiquidityConcern, SpotPriceConcern } from './concerns/types';
import {
  WeightedFactoryParams,
  WeightedFactoryAttributes,
  InitJoinAttributes,
  WeightedFactoryFormattedAttributes,
  SeedToken,
} from '../types';
import { Interface } from '@ethersproject/abi';
import { WeightedPoolFactory__factory } from '@balancer-labs/typechain';
import { BalancerSdkConfig } from '@/types';
import { BALANCER_NETWORK_CONFIG } from '@/lib/constants/config';
import { BigNumber, ethers } from 'ethers';

export class Weighted implements PoolType {
  public liquidityCalculator: LiquidityConcern;
  public spotPriceCalculator: SpotPriceConcern;
  factoryAddress: string;

  constructor(
    config: BalancerSdkConfig,
    private liquidityCalculatorConcern = WeightedPoolLiquidity,
    private spotPriceCalculatorConcern = WeightedPoolSpotPrice
  ) {
    this.liquidityCalculator = new this.liquidityCalculatorConcern();
    this.spotPriceCalculator = new this.spotPriceCalculatorConcern();
    this.factoryAddress =
      typeof config.network === 'number'
        ? (BALANCER_NETWORK_CONFIG[config.network].addresses.contracts
            .poolFactories.weighted as string)
        : (config.network.addresses.contracts.poolFactories.weighted as string);
  }

  async buildCreateTx(
    params: WeightedFactoryParams
  ): Promise<WeightedFactoryAttributes> {
    const sumOfWeights = params.seedTokens
      .map((t) => t.weight)
      .reduce((previous, current) => {
        return BigNumber.from(previous).add(BigNumber.from(current));
      }, 0);
    if (sumOfWeights.toString() != '100') {
      return {
        error: true,
        message: 'Token weights must add to 100',
      };
    }

    const attributes: WeightedFactoryFormattedAttributes = {
      name: params.name || `${this.formatPoolName(params.seedTokens)} Pool`,
      symbol: params.symbol || this.formatPoolName(params.seedTokens),
      tokens: params.seedTokens.map((token) => token.tokenAddress),
      weights: params.seedTokens.map((token) =>
        BigNumber.from(token.weight).mul(BigNumber.from('10000000000000000'))
      ),
      swapFeePercentage: ethers.utils.parseEther(params.initialFee),
      owner: params.owner,
    };
    const wPoolFactory = new Interface(WeightedPoolFactory__factory.abi);
    const data = wPoolFactory.encodeFunctionData(
      'create',
      Object.values(attributes)
    );

    return {
      error: false,
      to: this.factoryAddress,
      data,
      functionName: 'create',
      attributes,
      value: ethers.utils.parseEther(params.value),
    };
  }

  async buildInitJoin(initJoinParams: any): Promise<InitJoinAttributes> {
    return Promise.resolve({
      to: '',
      data: '0x0',
      attributes: {},
      functionName: 'initJoin',
    });
  }

  formatPoolName(tokens: SeedToken[]): string {
    return tokens
      .map((token) => {
        return token.weight + token.symbol;
      })
      .join('-');
  }
}
