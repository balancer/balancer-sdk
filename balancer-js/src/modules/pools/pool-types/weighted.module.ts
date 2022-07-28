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
import { defaultAbiCoder, Interface } from '@ethersproject/abi';
import {
  Vault__factory,
  WeightedPoolFactory__factory,
} from '@balancer-labs/typechain';
import { BalancerSdkConfig } from '@/types';
import { BALANCER_NETWORK_CONFIG } from '@/lib/constants/config';
import { BigNumber, BigNumberish, ethers } from 'ethers';
import { AssetHelpers } from '@/lib/utils';

type initJoinParams = {
  poolId: string;
  sender: string;
  receiver: string;
  tokenAddresses: string[];
  initialBalancesString: string[];
};
export class Weighted implements PoolType {
  public liquidityCalculator: LiquidityConcern;
  public spotPriceCalculator: SpotPriceConcern;
  addresses: Record<string, string> = {};

  constructor(
    config: BalancerSdkConfig,
    private liquidityCalculatorConcern = WeightedPoolLiquidity,
    private spotPriceCalculatorConcern = WeightedPoolSpotPrice
  ) {
    this.liquidityCalculator = new this.liquidityCalculatorConcern();
    this.spotPriceCalculator = new this.spotPriceCalculatorConcern();
    let addresses;
    if (typeof config.network === 'number') {
      addresses = BALANCER_NETWORK_CONFIG[config.network].addresses;
    } else {
      addresses = config.network.addresses;
    }
    this.addresses = {
      wrappedNativeAsset: addresses.tokens.wrappedNativeAsset,
      factoryAddress: addresses.contracts.poolFactories as string,
      vaultAddress: addresses.contracts.vault,
    };
  }

  buildCreateTx(params: WeightedFactoryParams): WeightedFactoryAttributes {
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

    const helpers = new AssetHelpers(this.addresses.wrappedNativeAsset);
    const [tokens, weights] = helpers.sortTokens(
      params.seedTokens.map((token) => token.tokenAddress),
      params.seedTokens.map((token) =>
        BigNumber.from(token.weight).mul(BigNumber.from('10000000000000000'))
      )
    ) as [string[], BigNumber[]];

    const attributes: WeightedFactoryFormattedAttributes = {
      name: params.name || `${this.formatPoolName(params.seedTokens)} Pool`,
      symbol: params.symbol || this.formatPoolName(params.seedTokens),
      tokens,
      weights,
      swapFeePercentage: ethers.utils.parseEther(params.initialFee),
      owner: params.owner,
    };
    const wPoolFactory = WeightedPoolFactory__factory.createInterface();
    const data = wPoolFactory.encodeFunctionData(
      'create',
      Object.values(attributes) as [
        string,
        string,
        string[],
        BigNumberish[],
        BigNumberish,
        string
      ]
    );

    return {
      error: false,
      to: this.addresses.factoryAddress,
      data,
      functionName: 'create',
      attributes,
      value: ethers.utils.parseEther(params.value),
    };
  }
  formatPoolName(tokens: SeedToken[]): string {
    return tokens
      .map((token) => {
        return token.weight + token.symbol;
      })
      .join('-');
  }
  buildInitJoin(params: initJoinParams): InitJoinAttributes {
    const vault = Vault__factory.createInterface();
    const JOIN_KIND_INIT = 0; // enum found in WeightedPoolUserData.sol
    const initUserData = defaultAbiCoder.encode(
      ['uint256', 'uint256[]'],
      [JOIN_KIND_INIT, params.initialBalancesString]
    );
    const data = vault.encodeFunctionData('joinPool', [
      params.poolId,
      params.sender,
      params.receiver,
      {
        assets: params.tokenAddresses,
        maxAmountsIn: params.initialBalancesString,
        userData: initUserData,
        fromInternalBalance: false,
      },
    ]);
    return {
      to: this.addresses.vaultAddress,
      data,
      attributes: {
        poolId: params.poolId,
        sender: params.sender,
        receiver: params.receiver,
        joinPoolRequest: {
          assets: params.tokenAddresses,
          maxAmountsIn: params.initialBalancesString,
          userData: initUserData,
          fromInternalBalance: false,
        },
      },
      functionName: 'joinPool',
    };
  }
}
