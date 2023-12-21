import { PoolDataService, SubgraphPoolBase } from '@balancer-labs/sor';
import {
  OrderDirection,
  Pool_OrderBy,
  PoolsQueryVariables,
  SubgraphClient,
} from '@/modules/subgraph/subgraph';
import { parseInt } from 'lodash';
import { getOnChainBalances } from './onChainData3';
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

import { Logger } from '@/lib/utils/logger';

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
  private readonly defaultArgs: GraphQLArgs;
  constructor(
    private readonly client: SubgraphClient,
    private readonly provider: Provider,
    private readonly network: BalancerNetworkConfig,
    private readonly sorConfig?: BalancerSdkSorConfig,
    query?: GraphQLQuery
  ) {
    // Default args can be overwritten by passing in a queryArgs object to .getPools
    this.defaultArgs = query?.args || {
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
  }

  /**
   * Returns pools from the subgraph filtered by queryArgs with on-chain balances
   *
   * @param queryArgs
   * @returns SubgraphPoolBase[]
   */
  async getPools(queryArgs?: GraphQLArgs): Promise<SubgraphPoolBase[]> {
    const pools = await this.getSubgraphPools(queryArgs);

    const filteredPools = pools.filter((p) => {
      if (!this.network.poolsToIgnore) return true;
      const index = this.network.poolsToIgnore.findIndex(
        (id) => id.toLowerCase() === p.id.toLowerCase()
      );
      return index === -1;
    });

    const mapped = mapPools(filteredPools);

    if (this.sorConfig && this.sorConfig.fetchOnChainBalances === false) {
      return mapped;
    }

    const logger = Logger.getInstance();
    logger.time(`fetching on-chain balances for ${mapped.length} pools`);

    const onChainBalances = await getOnChainBalances(
      mapped,
      this.network.addresses.contracts.multicall,
      this.network.addresses.contracts.vault,
      this.provider,
      this.network.multicallBatchSize
    );

    logger.timeEnd(`fetching on-chain balances for ${mapped.length} pools`);

    return onChainBalances;
  }

  private async getSubgraphPools(queryArgs?: GraphQLArgs) {
    const formattedQuery = new GraphQLArgsBuilder(
      queryArgs || this.defaultArgs
    ).format(new SubgraphArgsFormatter()) as PoolsQueryVariables;

    if (formattedQuery.first) {
      const { pools } = await this.client.Pools(formattedQuery);
      return pools;
    }

    const { pool0, pool1000, pool2000 } = await this.client.AllPools(
      formattedQuery
    );

    const pools = [...pool0, ...pool1000, ...pool2000];

    return pools;
  }
}
