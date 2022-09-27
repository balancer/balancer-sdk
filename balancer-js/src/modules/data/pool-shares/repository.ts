import { PoolShare, PoolShareAttribute } from './types';
import { BalancerSubgraphRepository } from '@/modules/subgraph/repository';
import {
    SubgraphPoolShareFragment,
    PoolShare_OrderBy,
    OrderDirection
} from '@/modules/subgraph/generated/balancer-subgraph-types';

export class PoolSharesRepository extends BalancerSubgraphRepository<PoolShare, PoolShareAttribute> {

    async query(args: any): Promise<PoolShare[]> {
        if (!args.orderBy) args.orderBy = PoolShare_OrderBy.Balance;
        if (!args.orderDirection) args.orderDirection = OrderDirection.Desc;
        if (!args.block && this.blockHeight) args.block = { number: await this.blockHeight() };

        const { poolShares } = await this.client.PoolShares(args);
        return poolShares.map(this.mapType);
    }
    
    mapType(subgraphPoolShare: SubgraphPoolShareFragment): PoolShare  {
        return {
            id: subgraphPoolShare.id,
            userAddress: subgraphPoolShare.userAddress.id,
            poolId: subgraphPoolShare.poolId.id,
            balance: subgraphPoolShare.balance
        };
    }
}
