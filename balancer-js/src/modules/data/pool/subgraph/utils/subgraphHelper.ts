import {
  createSubgraphClient,
  SubgraphClient,
  Pool,
  AllPoolsQueryVariables,
} from '@/modules/subgraph/subgraph';
import { parseFixed } from '@/lib/utils/math';

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

  async allPools(queryOptions?: AllPoolsQueryVariables): Promise<Pool[]> {
    console.time('fetching pools');
    const { pool0, pool1000, pool2000 } = await this.client.AllPools(
      queryOptions
    );
    console.timeEnd('fetching pools');
    return this.filter([...pool0, ...pool1000, ...pool2000] as Pool[]);
  }

  filter(pools: Pool[]): Pool[] {
    /*
    Replicates SG query:
        where: { swapEnabled: true, totalShares_gt: '0.000000000001' },
        orderBy: Pool_OrderBy.TotalLiquidity,
        orderDirection: OrderDirection.Desc,
    */
    const filteredPools = pools.filter((p) => {
      const totalShare = parseFixed(p.totalShares, 18);
      return p.swapEnabled === true && totalShare.gt('1000000');
    }) as Pool[];
    const sortedPools = filteredPools.sort(
      (a, b) => parseFloat(b.totalLiquidity) - parseFloat(a.totalLiquidity)
    );
    return sortedPools;
  }
}
