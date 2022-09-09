import { PoolShare } from '@/types';
import { PoolShareAttributes } from './types';
import {
    createSubgraphClient,
    SubgraphClient
} from '@/modules/subgraph/subgraph';
import {
    SubgraphPoolShareFragment,
    PoolShare_OrderBy,
    OrderDirection
} from '@/modules/subgraph/generated/balancer-subgraph-types';

export class PoolSharesRepository {
    
    private client: SubgraphClient;
  
    constructor(url: string) {
        this.client = createSubgraphClient(url);
    }
    
    async findById(id: string): Promise<PoolShare | undefined> {
        const { poolShare } = await this.client.PoolShare({ id: id });
        return poolShare ? this.mapType(poolShare) : undefined;
    }

    async findByUser(userAddress: string, 
            first: number = 200, 
            skip: number = 0):  Promise<PoolShare[]> {
        return this.findBy(PoolShareAttributes.UserAddress, userAddress, first, skip);
    }

    async findByPool(poolId: string, 
            first: number = 1000, 
            skip: number = 0):  Promise<PoolShare[]> {
        return this.findBy(PoolShareAttributes.PoolId, poolId, first, skip);
    }
    
    async findBy(attribute: string, 
            value: string,
            first: number, 
            skip: number):  Promise<PoolShare[]> {
        const { poolShares } = await this.client.PoolShares({ 
            where: { [attribute]: value }, 
            first: first,
            skip: skip,
            orderBy: PoolShare_OrderBy.Balance, 
            orderDirection: OrderDirection.Desc
        });
        return poolShares.map(this.mapType);
    }
    
    private mapType(subgraphPoolShare: SubgraphPoolShareFragment): PoolShare {
        return {
            id: subgraphPoolShare.id,
            userAddress: subgraphPoolShare.userAddress.id,
            poolId: subgraphPoolShare.poolId.id,
            balance: subgraphPoolShare.balance
        };
    }
}