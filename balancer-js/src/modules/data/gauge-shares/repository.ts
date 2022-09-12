import { GaugeShare } from '@/types';
import { GaugeShareAttribute, GaugeShareAttributes } from './types';
import { Findable } from '../types';
import { Network } from '@/lib/constants/network';
import {
    createGaugesClient,
    GaugesClient
} from '@/modules/subgraph/subgraph';
import {
    SubgraphGaugeShareFragment,
    GaugeShare_OrderBy,
    OrderDirection
} from '@/modules/subgraph/generated/balancer-gauges';

export class GaugeSharesRepository implements Findable<GaugeShare, GaugeShareAttribute> {

    private client: GaugesClient;
  
    constructor(url: string, 
        private chainId: Network,     
        private blockHeight?: () => Promise<number | undefined>    
    ) {
        this.client = createGaugesClient(url);
    }

    async find(id: string): Promise<GaugeShare | undefined> {
        const { gaugeShare } = await this.client.GaugeShare({ id: id, block: this.blockHeight 
            ? { number: await this.blockHeight() }
            : undefined });
        return gaugeShare ? this.mapType(gaugeShare) : undefined;
    }
        
    async findBy(attribute: GaugeShareAttribute, 
        value: string): Promise<GaugeShare | undefined> {
        if (attribute != GaugeShareAttributes.Id) return undefined;
        const { gaugeShare } = await this.client.GaugeShare( { [attribute]: value });
        return gaugeShare ? this.mapType(gaugeShare) : undefined;
    }
    
    async findAllBy(attribute: GaugeShareAttribute, 
            value: string,
            first: number, 
            skip: number):  Promise<GaugeShare[]> {
        const orderBy = {
            orderBy: GaugeShare_OrderBy.Balance, 
            orderDirection: OrderDirection.Desc
        };
        const { gaugeShares } = await this.client.GaugeShares({ 
            where: { [attribute]: value }, 
            first: first,
            skip: skip,
            ...orderBy,
            block: this.blockHeight
            ? { number: await this.blockHeight() }
            : undefined
        });
        return gaugeShares.map(this.mapType);
    }

    async findByUser(userAddress: string, 
            first: number = 500, 
            skip: number = 0):  Promise<GaugeShare[]> {
        return this.findAllBy(GaugeShareAttributes.UserAddress, userAddress, first, skip);
    }

    async findByGauge(gaugeId: string, 
            first: number = 1000, 
            skip: number = 0):  Promise<GaugeShare[]> {
        return this.findAllBy(GaugeShareAttributes.GaugeId, gaugeId, first, skip);
    }

    private mapType(subgraphGaugeShare: SubgraphGaugeShareFragment): GaugeShare {
        return {
            id: subgraphGaugeShare.id,
            userAddress: subgraphGaugeShare.user.id,
            gaugeId: subgraphGaugeShare.gauge.id,
            balance: subgraphGaugeShare.balance,
            gaugeIsKilled: subgraphGaugeShare.gauge.isKilled
        };
    }
}