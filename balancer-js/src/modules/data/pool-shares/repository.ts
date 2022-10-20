/* eslint-disable @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any */
import { PoolShare, PoolShareAttributes } from './types';
import { BalancerSubgraphRepository } from '@/modules/subgraph/repository';
import {
  SubgraphPoolShareFragment,
  PoolShare_OrderBy,
  OrderDirection,
} from '@/modules/subgraph/generated/balancer-subgraph-types';

export class PoolSharesRepository extends BalancerSubgraphRepository<
  PoolShare,
  PoolShareAttributes
> {
  async query(args: any): Promise<PoolShare[]> {
    if (!args.orderBy) args.orderBy = PoolShare_OrderBy.Balance;
    if (!args.orderDirection) args.orderDirection = OrderDirection.Desc;
    if (!args.block && this.blockHeight)
      args.block = { number: await this.blockHeight() };

    const { poolShares } = await this.client.PoolShares(args);
    return poolShares.map(this.mapType);
  }

  mapType(subgraphPoolShare: SubgraphPoolShareFragment): PoolShare {
    return {
      id: subgraphPoolShare.id,
      userAddress: subgraphPoolShare.userAddress.id,
      poolId: subgraphPoolShare.poolId.id,
      balance: subgraphPoolShare.balance,
    };
  }

  async findByUser(
    userAddress: string,
    first?: number,
    skip?: number
  ): Promise<PoolShare[]> {
    return this.findAllBy(
      PoolShareAttributes.UserAddress,
      userAddress,
      first,
      skip
    );
  }

  async findByPool(
    poolId: string,
    first?: number,
    skip?: number
  ): Promise<PoolShare[]> {
    return this.findAllBy(PoolShareAttributes.PoolId, poolId, first, skip);
  }
}
