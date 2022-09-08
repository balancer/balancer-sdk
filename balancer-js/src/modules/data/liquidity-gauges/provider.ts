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
  gauges?: Promise<LiquidityGauge[]>;

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

  async fetch(): Promise<LiquidityGauge[]> {
    console.time('fetching liquidity gauges');
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
    console.timeEnd('fetching liquidity gauges');
    return gauges.map(this.compose.bind(this));
  }

  async find(id: string): Promise<LiquidityGauge | undefined> {
    if (!this.gauges) {
      this.gauges = this.fetch();
    }

    return (await this.gauges).find((g) => g.id == id);
  }

  async findBy(
    attribute: string,
    value: string
  ): Promise<LiquidityGauge | undefined> {
    if (!this.gauges) {
      this.gauges = this.fetch();
    }

    let gauge: LiquidityGauge | undefined;
    if (attribute == 'id') {
      return this.find(value);
    } else if (attribute == 'address') {
      return this.find(value);
    } else if (attribute == 'poolId') {
      gauge = (await this.gauges).find((g) => g.poolId == value);
    } else if (attribute == 'poolAddress') {
      gauge = (await this.gauges).find((g) => g.poolAddress == value);
    } else {
      throw `search by ${attribute} not implemented`;
    }

    return gauge;
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
