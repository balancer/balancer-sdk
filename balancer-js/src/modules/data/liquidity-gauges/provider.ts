import { GaugeControllerMulticallRepository } from '../gauge-controller/multicall';
import { LiquidityGaugesMulticallRepository, RewardData } from './multicall';
import { LiquidityGaugesSubgraphRepository } from './subgraph';
import type {
  Maybe,
  SubgraphLiquidityGauge,
} from '@/modules/subgraph/subgraph';
import type { Findable } from '../types';
import type { Provider } from '@ethersproject/providers';
import type { Network } from '@/types';

export interface LiquidityGauge {
  id: string;
  address: string;
  name: string;
  poolId?: Maybe<string>;
  poolAddress: string;
  totalSupply: number;
  workingSupply: number;
  relativeWeight: number;
  rewardTokens?: { [tokenAddress: string]: RewardData };
}

export class LiquidityGaugeSubgraphRPCProvider
  implements Findable<LiquidityGauge>
{
  gaugeController?: GaugeControllerMulticallRepository;
  multicall: LiquidityGaugesMulticallRepository;
  subgraph: LiquidityGaugesSubgraphRepository;
  workingSupplies: { [gaugeAddress: string]: number } = {};
  relativeWeights: { [gaugeAddress: string]: number } = {};
  rewardTokens: {
    [gaugeAddress: string]: { [tokenAddress: string]: RewardData };
  } = {};

  constructor(
    subgraphUrl: string,
    multicallAddress: string,
    gaugeControllerAddress: string,
    private chainId: Network,
    provider: Provider
  ) {
    if (gaugeControllerAddress) {
      this.gaugeController = new GaugeControllerMulticallRepository(
        multicallAddress,
        gaugeControllerAddress,
        provider
      );
    }
    this.multicall = new LiquidityGaugesMulticallRepository(
      multicallAddress,
      chainId,
      provider
    );
    this.subgraph = new LiquidityGaugesSubgraphRepository(subgraphUrl);
  }

  async fetch(): Promise<void> {
    const gauges = await this.subgraph.fetch();
    const gaugeAddresses = gauges.map((g) => g.id);
    this.rewardTokens = await this.multicall.getRewardData(gaugeAddresses);
    if (this.chainId == 1) {
      this.workingSupplies = await this.multicall.getWorkingSupplies(
        gaugeAddresses
      );
    }
    if (this.gaugeController) {
      this.relativeWeights = await this.gaugeController.getRelativeWeights(
        gaugeAddresses
      );
    }
  }

  async find(id: string): Promise<LiquidityGauge | undefined> {
    if (Object.keys(this.relativeWeights).length == 0) {
      await this.fetch();
    }

    const gauge = await this.subgraph.find(id);
    if (!gauge) {
      return;
    }

    return this.compose(gauge);
  }

  async findBy(
    attribute: string,
    value: string
  ): Promise<LiquidityGauge | undefined> {
    if (Object.keys(this.relativeWeights).length == 0) {
      await this.fetch();
    }

    let gauge: SubgraphLiquidityGauge | undefined;
    if (attribute == 'id') {
      return this.find(value);
    } else if (attribute == 'address') {
      return this.find(value);
    } else if (attribute == 'poolId') {
      gauge = await this.subgraph.findBy('poolId', value);
    } else if (attribute == 'poolAddress') {
      gauge = await this.subgraph.findBy('poolAddress', value);
    } else {
      throw `search by ${attribute} not implemented`;
    }
    if (!gauge) {
      return undefined;
    }

    return this.compose(gauge);
  }

  private compose(subgraphGauge: SubgraphLiquidityGauge) {
    return {
      id: subgraphGauge.id,
      address: subgraphGauge.id,
      name: subgraphGauge.symbol,
      poolId: subgraphGauge.poolId,
      poolAddress: subgraphGauge.poolAddress,
      totalSupply: parseFloat(subgraphGauge.totalSupply),
      workingSupply: this.workingSupplies[subgraphGauge.id],
      relativeWeight: this.relativeWeights[subgraphGauge.id],
      rewardTokens: this.rewardTokens[subgraphGauge.id],
    };
  }
}
