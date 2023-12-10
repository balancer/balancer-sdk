import { Findable } from '../types';
import {
  createGaugesClient,
  GaugesClient,
  SubgraphLiquidityGauge,
} from '@/modules/subgraph/subgraph';

/**
 * Access liquidity gauges indexed by subgraph.
 * Because we have ~100 gauges to save on repeated http calls we cache all results as `gauges` on an instance.
 * Balancer's subgraph URL: https://thegraph.com/hosted-service/subgraph/balancer-labs/balancer-gauges
 */
export class LiquidityGaugesSubgraphRepository
  implements Findable<SubgraphLiquidityGauge>
{
  private client: GaugesClient;
  public gauges: SubgraphLiquidityGauge[] = [];

  constructor(url: string) {
    this.client = createGaugesClient(url);
  }

  async fetch(): Promise<SubgraphLiquidityGauge[]> {
    console.time('fetching liquidity gauges');
    const queryResult = await this.client.Pools({
      first: 1000,
      where: {
        preferentialGauge_not: null,
      },
    });
    const qauges = queryResult.pools.map((pool) => pool.preferentialGauge);
    // TODO: optionally convert subgraph type to sdk internal type
    this.gauges = qauges as SubgraphLiquidityGauge[];

    console.timeEnd('fetching liquidity gauges');
    return this.gauges;
  }

  async find(id: string): Promise<SubgraphLiquidityGauge | undefined> {
    if (this.gauges.length == 0) {
      await this.fetch();
    }

    return this.gauges.find((gauge) => gauge.id == id);
  }

  async findBy(
    param: string,
    value: string
  ): Promise<SubgraphLiquidityGauge | undefined> {
    if (this.gauges.length == 0) {
      await this.fetch();
    }

    if (param == 'id') {
      return this.find(value);
    } else if (param == 'poolId') {
      return this.gauges.find((gauge) => gauge.poolId == value);
    } else if (param == 'poolAddress') {
      return this.gauges.find((gauge) => gauge.poolAddress == value);
    } else {
      throw `search by ${param} not implemented`;
    }
  }
}
