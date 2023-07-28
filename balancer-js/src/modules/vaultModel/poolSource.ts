import { cloneDeep } from 'lodash';
import {
  SubgraphPoolBase,
  SubgraphToken,
  PoolDataService,
  WeightedPool,
  StablePool,
  MetaStablePool,
  LinearPool,
  PhantomStablePool,
  ComposableStablePool,
} from '@balancer-labs/sor';
import { Logger } from '@/lib/utils/logger';

export interface PoolDictionary {
  [poolId: string]: Pool;
}

export type Pool =
  | (
      | WeightedPool
      | StablePool
      | LinearPool
      | MetaStablePool
      | PhantomStablePool
      | ComposableStablePool
    ) & { SubgraphType: string };

export class PoolsSource {
  poolsArray: SubgraphPoolBase[] = [];
  poolsDict: PoolDictionary = {};
  constructor(
    private poolDataService: PoolDataService,
    private wrappedNativeAsset: string
  ) {}
  dataSource(): PoolDataService {
    return this.poolDataService;
  }

  async all(refresh = false): Promise<SubgraphPoolBase[]> {
    if (refresh || this.poolsArray.length === 0) {
      const list = cloneDeep(await this.dataSource().getPools());
      for (const pool of list) {
        // For non pre-minted BPT pools we add the BPT to the token list. This makes the SOR functions work for joins/exits
        if (
          [
            'Weighted',
            'Investment',
            'Stable',
            'LiquidityBootstrapping',
          ].includes(pool.poolType)
        ) {
          const BptAsToken: SubgraphToken = {
            address: pool.address,
            balance: pool.totalShares,
            decimals: 18,
            priceRate: '1',
            weight: '0',
          };
          pool.tokens.push(BptAsToken);
          pool.tokensList.push(pool.address);
        }
      }
      this.poolsArray = list;
    }
    return this.poolsArray;
  }

  parseToPoolsDict(pools: SubgraphPoolBase[]): PoolDictionary {
    return Object.fromEntries(
      cloneDeep(pools)
        .filter(
          (pool) => pool.tokensList.length > 0 && pool.tokens[0].balance !== '0'
        )
        .map((pool) => [pool.id, this.parseNewPool(pool)])
        .filter(([, pool]) => pool !== undefined)
    );
  }

  parseNewPool(subgraphPool: SubgraphPoolBase): Pool | undefined {
    // We're not interested in any pools which don't allow swapping
    if (!subgraphPool.swapEnabled) return undefined;

    let pool: Pool = {} as Pool;

    try {
      if (
        ['Weighted', 'Investment', 'LiquidityBootstrapping'].includes(
          subgraphPool.poolType
        )
      ) {
        const sorPool = WeightedPool.fromPool(subgraphPool, false);
        pool = sorPool as Pool;
      } else if (subgraphPool.poolType === 'Stable') {
        const sorPool = StablePool.fromPool(subgraphPool);
        pool = sorPool as Pool;
      } else if (subgraphPool.poolType === 'MetaStable') {
        const sorPool = MetaStablePool.fromPool(subgraphPool);
        pool = sorPool as Pool;
      } else if (subgraphPool.poolType.toString().includes('Linear')) {
        const sorPool = LinearPool.fromPool(subgraphPool);
        pool = sorPool as Pool;
      } else if (subgraphPool.poolType === 'StablePhantom') {
        const sorPool = PhantomStablePool.fromPool(subgraphPool);
        pool = sorPool as Pool;
      } else if (subgraphPool.poolType === 'ComposableStable') {
        const sorPool = ComposableStablePool.fromPool(subgraphPool);
        pool = sorPool as Pool;
      } else {
        const logger = Logger.getInstance();
        logger.warn(
          `Unknown pool type or type field missing: ${subgraphPool.poolType} ${subgraphPool.id}`
        );
        return undefined;
      }
      if (!pool) throw new Error('Issue with Pool');
      pool.SubgraphType = subgraphPool.poolType;
    } catch (err) {
      console.error(`Error parseNewPool`);
      return undefined;
    }
    return pool;
  }

  /**
   * Converts Subgraph array into PoolDictionary
   * @param refresh
   * @returns
   */
  async poolsDictionary(refresh = false): Promise<PoolDictionary> {
    if (refresh || Object.keys(this.poolsDict).length === 0) {
      const poolsArray = await this.all(refresh);
      this.poolsDict = this.parseToPoolsDict(poolsArray);
    }
    return this.poolsDict;
  }
}
