import {
  createSubgraphClient,
  SubgraphClient,
  Pool,
  AllPoolsQueryVariables,
} from '@/modules/subgraph/subgraph';
import { parseFixed } from '@/lib/utils/math';

export interface SubgraphOptions {
  queryOptions?: AllPoolsQueryVariables;
  poolsToIgnore?: string[];
}

/**
 * Access pools using generated subgraph client.
 * Previous test showed that adding swapEnabled: true added about 300ms to the query and ordering by liquidity adds almost a whole second.
 * async calling and paginating every single pool and then filtering locally for swapEnabled was significantly faster.
 */
export class SubgraphHelper {
  private client: SubgraphClient;

  constructor(url: string) {
    this.client = createSubgraphClient(url);
  }

  /**
   * Fetches pools from subgraph
   * @param queryOptions Custom query
   * @param useDefaultFilter If true the result will filter for 'useful' pools. swapEnabled, totalShares > '0.000000000001' and order in descending TotalLiquidity.
   * @returns Pools
   */
  async allPools(
    options?: SubgraphOptions,
    useDefaultFilter = true
  ): Promise<Pool[]> {
    console.time('fetching pools');
    const { pool0, pool1000, pool2000 } = await this.client.AllPools(
      options?.queryOptions
    );
    console.timeEnd('fetching pools');
    return this.filter(
      [...pool0, ...pool1000, ...pool2000] as Pool[],
      useDefaultFilter,
      options
    );
  }

  /**
   * Filters pools. Replicates SG query:
        where: { swapEnabled: true, totalShares_gt: '0.000000000001' },
        orderBy: Pool_OrderBy.TotalLiquidity,
        orderDirection: OrderDirection.Desc,
   * @param pools Pools to filter
   * @returns Filtered pools
   */
  filter(
    pools: Pool[],
    useDefaultFilter: boolean,
    options?: SubgraphOptions
  ): Pool[] {
    let filteredPools: Pool[];
    if (useDefaultFilter)
      filteredPools = pools.filter((p) => {
        const totalShare = parseFixed(p.totalShares, 18);
        const filterPool = options?.poolsToIgnore?.includes(p.address);
        return (
          p.swapEnabled === true && totalShare.gt('1000000') && !filterPool
        );
      }) as Pool[];
    else
      filteredPools = pools.filter((p) => {
        const filterPool = options?.poolsToIgnore?.includes(p.address);
        return !filterPool;
      }) as Pool[];

    const sortedPools = filteredPools.sort(
      (a, b) => parseFloat(b.totalLiquidity) - parseFloat(a.totalLiquidity)
    );
    return sortedPools;
  }
}
