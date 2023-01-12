import { PoolDataService, SubgraphPoolBase } from '@balancer-labs/sor';
import {
  OrderDirection,
  Pool_OrderBy,
  SubgraphClient,
} from '@/modules/subgraph/subgraph';
import { parseInt } from 'lodash';
import { getOnChainBalances } from './onChainData';
import { Provider } from '@ethersproject/providers';
import { BalancerNetworkConfig, BalancerSdkSorConfig } from '@/types';

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
  constructor(
    private readonly client: SubgraphClient,
    private readonly provider: Provider,
    private readonly network: BalancerNetworkConfig,
    private readonly sorConfig: BalancerSdkSorConfig
  ) {}

  public async getPools(): Promise<SubgraphPoolBase[]> {
    const { pool0, pool1000, pool2000 } = await this.client.AllPools({
      where: { swapEnabled: true, totalShares_gt: '0.000000000001' },
      orderBy: Pool_OrderBy.TotalLiquidity,
      orderDirection: OrderDirection.Desc,
    });

    const pools = [...pool0, ...pool1000, ...pool2000];

    const mapped = mapPools(pools);

    if (this.sorConfig.fetchOnChainBalances === false) {
      return mapped;
    }

    return getOnChainBalances(
      mapped,
      this.network.addresses.contracts.multicall,
      this.network.addresses.contracts.vault,
      this.provider
    );
  }
}
