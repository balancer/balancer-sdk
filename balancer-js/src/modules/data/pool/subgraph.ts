import { BalancerSdkConfig, Pool, PoolType } from '@/types';
import { PoolAttribute, PoolRepository } from './types';
import { Subgraph } from '@/modules/subgraph/subgraph.module';
import { PoolToken } from '@/modules/subgraph/subgraph';

export class SubgraphPoolRepository implements PoolRepository {
  private subgraph: Subgraph;

  constructor(sdkConfig: BalancerSdkConfig) {
    this.subgraph = new Subgraph(sdkConfig);
  }

  async find(id: string): Promise<Pool | undefined> {
    const { pool } = await this.subgraph.client.Pool({ id });
    return this.mapPool(pool);
  }

  async findBy(
    attribute: PoolAttribute,
    value: string
  ): Promise<Pool | undefined> {
    switch (attribute) {
      case 'id':
        return this.find(value);
      case 'address':
        // eslint-disable-next-line no-case-declarations
        const { pool0 } = await this.subgraph.client.Pools({
          where: { address: value },
        });
        return this.mapPool(pool0);
      default:
        return undefined;
    }
  }

  // Helper methods

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapPool(pool: any): Pool | undefined {
    if (!pool) return undefined;
    const poolType = pool?.poolType as PoolType;
    if (!poolType) throw new Error('Unknown pool type');
    const tokens = (pool?.tokens as PoolToken[]) || [];
    if (tokens.length === 0) throw new Error('Pool without tokens');
    return {
      ...pool,
      poolType,
      tokens,
    };
  }
}
