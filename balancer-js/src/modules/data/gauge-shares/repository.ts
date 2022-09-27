import { GaugeShare, GaugeShareAttribute } from './types';
import { GaugesSubgraphRepository } from '@/modules/subgraph/repository';
import {
    SubgraphGaugeShareFragment,
    GaugeShare_OrderBy,
    OrderDirection
} from '@/modules/subgraph/generated/balancer-gauges';

export class GaugeSharesRepository extends GaugesSubgraphRepository<GaugeShare, GaugeShareAttribute> {

    async query(args: any): Promise<GaugeShare[]> {
        if (!args.orderBy) args.orderBy = GaugeShare_OrderBy.Balance;
        if (!args.orderDirection) args.orderDirection = OrderDirection.Desc;
        if (!args.block && this.blockHeight) args.block = { number: await this.blockHeight() };

        const { gaugeShares } = await this.client.GaugeShares(args);
        return gaugeShares.map(this.mapType);
    }

    mapType(subgraphGaugeShare: SubgraphGaugeShareFragment): GaugeShare {
        return {
            id: subgraphGaugeShare.id,
            balance: subgraphGaugeShare.balance,
            userAddress: subgraphGaugeShare.user?.id,
            gaugeId: subgraphGaugeShare.gauge?.id,
            gaugeIsKilled: subgraphGaugeShare.gauge?.isKilled
        };
    }
}