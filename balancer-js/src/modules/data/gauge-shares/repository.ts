/* eslint-disable @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any */
import { GaugeShare, GaugeShareAttributes } from './types';
import { GaugesSubgraphRepository } from '@/modules/subgraph/repository';
import {
  SubgraphGaugeShareFragment,
  GaugeShare_OrderBy,
  OrderDirection,
} from '@/modules/subgraph/generated/balancer-gauges';

export class GaugeSharesRepository extends GaugesSubgraphRepository<
  GaugeShare,
  GaugeShareAttributes
> {
  async query(args: any): Promise<GaugeShare[]> {
    if (!args.orderBy) args.orderBy = GaugeShare_OrderBy.balance;
    if (!args.orderDirection) args.orderDirection = OrderDirection.desc;
    if (!args.block && this.blockHeight)
      args.block = { number: await this.blockHeight() };

    const { gaugeShares } = await this.client.GaugeShares(args);
    return gaugeShares.map(this.mapType);
  }

  mapType(subgraphGaugeShare: SubgraphGaugeShareFragment): GaugeShare {
    return {
      id: subgraphGaugeShare.id,
      balance: subgraphGaugeShare.balance,
      userAddress: subgraphGaugeShare.user?.id,
      gauge: {
        id: subgraphGaugeShare.gauge.id,
        poolId: subgraphGaugeShare.gauge.poolId || undefined,
        isKilled: subgraphGaugeShare.gauge.isKilled,
        totalSupply: subgraphGaugeShare.gauge.totalSupply,
      },
    };
  }

  async findByUser(
    userAddress: string,
    first?: number,
    skip?: number
  ): Promise<GaugeShare[]> {
    return this.findAllBy(
      GaugeShareAttributes.UserAddress,
      userAddress,
      first,
      skip
    );
  }

  async findByGauge(
    gaugeId: string,
    first?: number,
    skip?: number
  ): Promise<GaugeShare[]> {
    return this.findAllBy(GaugeShareAttributes.GaugeId, gaugeId, first, skip);
  }
}
