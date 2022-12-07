/* eslint-disable @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any */
import { PoolJoinExit, PoolJoinExitAttributes } from './types';
import { BalancerSubgraphRepository } from '@/modules/subgraph/repository';
import {
  JoinExit_OrderBy,
  OrderDirection,
  SubgraphJoinExitFragment,
} from '@/modules/subgraph/generated/balancer-subgraph-types';

export class PoolJoinExitRepository extends BalancerSubgraphRepository<
  PoolJoinExit,
  PoolJoinExitAttributes
> {
  async query(args: any): Promise<PoolJoinExit[]> {
    if (!args.orderBy) args.orderBy = JoinExit_OrderBy.Timestamp;
    if (!args.orderDirection) args.orderDirection = OrderDirection.Asc;
    if (!args.block && this.blockHeight)
      args.block = { number: await this.blockHeight() };

    const { joinExits } = await this.client.JoinExits(args);
    return joinExits.map(this.mapType);
  }

  mapType(item: SubgraphJoinExitFragment): PoolJoinExit {
    return {
      id: item.id,
      userAddress: item.user.id,
      poolId: item.pool.id,
      timestamp: item.timestamp,
      type: item.type,
      amounts: item.amounts,
      tokens: item.pool.tokensList,
    };
  }

  async findByUser(
    sender: string,
    first?: number,
    skip?: number
  ): Promise<PoolJoinExit[]> {
    return this.findAllBy(PoolJoinExitAttributes.Sender, sender, first, skip);
  }

  async findJoins(sender: string, pool: string): Promise<PoolJoinExit[]> {
    return this.query({ where: { sender, pool, type: 'Join' } });
  }

  async findExits(sender: string, pool: string): Promise<PoolJoinExit[]> {
    return this.query({ where: { sender, pool, type: 'Exit' } });
  }

  async findByPool(
    poolId: string,
    first?: number,
    skip?: number
  ): Promise<PoolJoinExit[]> {
    return this.findAllBy(PoolJoinExitAttributes.Pool, poolId, first, skip);
  }
}
