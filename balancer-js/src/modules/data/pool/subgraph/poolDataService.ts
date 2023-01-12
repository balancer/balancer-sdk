import { PoolDataService, SubgraphPoolBase } from '@balancer-labs/sor';
import { parseInt } from 'lodash';
import { getOnChainBalances } from './utils/onChainData';
import { Provider } from '@ethersproject/providers';
import { BalancerNetworkConfig, BalancerSdkSorConfig } from '@/types';
import { SubgraphHelper } from './utils/subgraphHelper';

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
  private subgraphHelper: SubgraphHelper;

  constructor(
    private readonly provider: Provider,
    private readonly network: BalancerNetworkConfig,
    private readonly sorConfig: BalancerSdkSorConfig
  ) {
    this.subgraphHelper = new SubgraphHelper(this.network.urls.subgraph);
  }

  public async getPools(): Promise<SubgraphPoolBase[]> {
    const pools = await this.subgraphHelper.allPools();

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
