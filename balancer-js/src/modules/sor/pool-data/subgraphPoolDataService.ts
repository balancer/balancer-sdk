import { PoolDataService, SubgraphPoolBase } from '@balancer-labs/sor';
import {
  OrderDirection,
  Pool_OrderBy,
  PoolsQueryVariables,
  SubgraphClient,
} from '@/modules/subgraph/subgraph';
import { parseInt } from 'lodash';
import { getOnChainBalances } from './onChainData';
import { Provider } from '@ethersproject/providers';
import {
  BalancerNetworkConfig,
  BalancerSdkSorConfig,
  GraphQLQuery,
} from '@/types';
import { GraphQLArgs } from '@/lib/graphql/types';
import {
  GraphQLArgsBuilder,
  SubgraphArgsFormatter,
} from '@/lib/graphql/args-builder';

import { isSameAddress } from '@/lib/utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapPools(pools: any[]): SubgraphPoolBase[] {
  return pools.map((pool) => ({
    ...pool,
    poolType: pool.poolType || '',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tokens: (pool.tokens || []).map((token: any) => ({
      ...token,
      weight: token.weight || null,
    })),
    totalWeight: pool.totalWeight || undefined,
    amp: pool.amp || undefined,
    expiryTime: pool.expiryTime ? parseInt(pool.expiryTime) : undefined,
    unitSeconds: pool.unitSeconds ? parseInt(pool.unitSeconds) : undefined,
    principalToken: pool.principalToken || undefined,
    baseToken: pool.baseToken || undefined,
  }));
}

export class SubgraphPoolDataService implements PoolDataService {
  private readonly query: GraphQLQuery;
  constructor(
    private readonly client: SubgraphClient,
    private readonly provider: Provider,
    private readonly network: BalancerNetworkConfig,
    private readonly sorConfig?: BalancerSdkSorConfig,
    query?: GraphQLQuery
  ) {
    const defaultArgs: GraphQLArgs = {
      orderBy: Pool_OrderBy.TotalLiquidity,
      orderDirection: OrderDirection.Desc,
      where: {
        swapEnabled: {
          eq: true,
        },
        totalShares: {
          gt: 0.000000000001,
        },
      },
    };

    const args = query?.args || defaultArgs;
    const attrs = query?.attrs || {};

    this.query = {
      args,
      attrs,
    };
  }

  public async getPools(): Promise<SubgraphPoolBase[]> {
    console.log('here');
    const pools = await this.getSubgraphPools();

    const filteredPools = pools.filter((p) => {
      if (p.poolType === 'FX') return false;
      if (!this.network.poolsToIgnore) return true;
      const index = this.network.poolsToIgnore.findIndex((addr) =>
        isSameAddress(addr, p.address)
      );
      return index === -1;
    });

    const mapped = mapPools(filteredPools);

    if (this.sorConfig && this.sorConfig.fetchOnChainBalances === false) {
      return mapped;
    }

    return getOnChainBalances(
      mapped,
      this.network.addresses.contracts.multicall,
      this.network.addresses.contracts.vault,
      this.provider
    );
  }

  private async getSubgraphPools() {
    const formattedQuery = new GraphQLArgsBuilder(this.query.args).format(
      new SubgraphArgsFormatter()
    ) as PoolsQueryVariables;
    console.log(formattedQuery);
    const { pool0, pool1000, pool2000 } = await this.client.AllPools(
      formattedQuery
    );

    const pools = [...pool0, ...pool1000, ...pool2000];

    return pools;
  }
}
