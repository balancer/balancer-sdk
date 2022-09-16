import { PoolShare } from '@/types';
import { PoolShareAttribute, PoolShareAttributes } from './types';
import { Findable } from '../types';
import { BalancerSubgraphRepository } from '@/modules/subgraph/repository';
import {
    SubgraphPoolShareFragment,
    PoolShare_OrderBy,
    OrderDirection
} from '@/modules/subgraph/generated/balancer-subgraph-types';

export class PoolSharesRepository extends BalancerSubgraphRepository<PoolShare> 
    implements Findable<PoolShare, PoolShareAttribute> {
    
    async find(id: string): Promise<PoolShare | undefined> {
        const args = { id: id, block: this.blockHeight 
            ? { number: await this.blockHeight() }
            : undefined };
        return this.get(args);
    }
    
    async findBy(attribute: PoolShareAttribute, 
        value: string): Promise<PoolShare | undefined> {
        const args = { [attribute]: value };
        return this.get(args);
    }
    
    async findAllBy(attribute: PoolShareAttribute, 
            value: string,
            first: number, 
            skip: number):  Promise<PoolShare[]> {
        const orderBy = {
            orderBy: PoolShare_OrderBy.Balance, 
            orderDirection: OrderDirection.Desc,
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

    async query(args = {}): Promise<PoolShare[]> {
        const { poolShares } = await this.client.PoolShares(args);
        return poolShares.map(this.mapType);
    }

    async get(args = {}): Promise<PoolShare | undefined> {
        const { poolShares } = await this.client.PoolShares(args);
        return (poolShares && poolShares.length > 0) ? this.mapType(poolShares[0]) : undefined; 
    }
    
    async findByUser(userAddress: string, 
            first: number = 500, 
            skip: number = 0):  Promise<PoolShare[]> {
        return this.findAllBy(PoolShareAttributes.UserAddress, userAddress, first, skip);
    }
    
    async findByPool(poolId: string, 
            first: number = 1000, 
            skip: number = 0):  Promise<PoolShare[]> {
        return this.findAllBy(PoolShareAttributes.PoolId, poolId, first, skip);
    }
    
    mapType(subgraphPoolShare: SubgraphPoolShareFragment): PoolShare {
        return {
            id: subgraphPoolShare.id,
            userAddress: subgraphPoolShare.userAddress.id,
            poolId: subgraphPoolShare.poolId.id,
            balance: subgraphPoolShare.balance
        };
    }
}