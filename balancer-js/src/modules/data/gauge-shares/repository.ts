import { GaugeShare } from '@/types';
import { GaugeShareAttribute, GaugeShareAttributes } from './types';
import { Findable } from '../types';
import { GaugesSubgraphRepository } from '@/modules/subgraph/repository';
import {
    SubgraphGaugeShareFragment,
    GaugeShare_OrderBy,
    OrderDirection
} from '@/modules/subgraph/generated/balancer-gauges';

export class GaugeSharesRepository extends GaugesSubgraphRepository<GaugeShare> 
    implements Findable<GaugeShare, GaugeShareAttribute> {

    async find(id: string): Promise<GaugeShare | undefined> {
        const args = { id: id, block: this.blockHeight 
            ? { number: await this.blockHeight() }
            : undefined };
        return this.get(args);
    }
        
    async findBy(attribute: GaugeShareAttribute, 
        value: string): Promise<GaugeShare | undefined> {
        const args = { [attribute]: value };
        return this.get(args);
    }
    
    async findAllBy(attribute: GaugeShareAttribute, 
            value: string,
            first: number, 
            skip: number):  Promise<GaugeShare[]> {
        const orderBy = {
            orderBy: GaugeShare_OrderBy.Balance, 
            orderDirection: OrderDirection.Desc
        };
        const args = { 
            where: { [attribute]: value }, 
            first: first,
            skip: skip,
            ...orderBy,
            block: this.blockHeight
            ? { number: await this.blockHeight() }
            : undefined
        };
        return this.query(args);
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

    async query(args = {}): Promise<GaugeShare[]> {
        const { gaugeShares } = await this.client.GaugeShares(args);
        return gaugeShares.map(this.mapType);
    }

    async get(args = {}): Promise<GaugeShare | undefined> {
        const { gaugeShares } = await this.client.GaugeShares(args);
        return (gaugeShares && gaugeShares.length > 0) ? this.mapType(gaugeShares[0]) : undefined; 
    }

    mapType(subgraphGaugeShare: SubgraphGaugeShareFragment): GaugeShare {
        return {
            id: subgraphGaugeShare.id,
            userAddress: subgraphGaugeShare.user.id,
            gaugeId: subgraphGaugeShare.gauge.id,
            balance: subgraphGaugeShare.balance,
            gaugeIsKilled: subgraphGaugeShare.gauge.isKilled
        };
    }
}