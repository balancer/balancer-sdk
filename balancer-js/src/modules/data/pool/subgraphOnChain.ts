import { Findable, Searchable } from '../types';
import { Provider } from '@ethersproject/providers';
import { PoolAttribute, PoolsRepositoryFetchOptions } from './types';
import { Pool } from '@/types';
import { getOnChainBalances } from '../../../modules/sor/pool-data/onChainData';
import { PoolsSubgraphRepository } from './subgraph';
import { isSameAddress } from '@/lib/utils';

interface PoolsSubgraphOnChainRepositoryOptions {
  provider: Provider;
  multicall: string;
  vault: string;
}

/**
 * Access pools using generated subgraph client and multicall.
 */
export class PoolsSubgraphOnChainRepository
  implements Findable<Pool, PoolAttribute>, Searchable<Pool>
{
  private provider: Provider;
  private pools?: Promise<Pool[]>;
  private multicall: string;
  private vault: string;
  public skip = 0;

  /**
   * Repository using multicall to get onchain data.
   *
   * @param poolsSubgraph subgraph repository
   * @param options options containing provider, multicall and vault addresses
   */
  constructor(
    private poolsSubgraph: PoolsSubgraphRepository,
    options: PoolsSubgraphOnChainRepositoryOptions,
    private readonly poolsToIgnore: string[] | undefined
  ) {
    this.provider = options.provider;
    this.multicall = options.multicall;
    this.vault = options.vault;
  }

  private filterPools(pools: Pool[]): Pool[] {
    const filteredPools = pools.filter((p) => {
      if (!this.poolsToIgnore) return true;
      const index = this.poolsToIgnore.findIndex((addr) =>
        isSameAddress(addr, p.address)
      );
      return index === -1;
    });
    return filteredPools;
  }

  /**
   * We need a list of all the pools, for calculating APRs (nested pools), and for SOR (path finding).
   * All the pools are fetched on page load and cachced for speedy lookups.
   *
   * @returns Promise resolving to pools list
   */
  private async fetchDefault(): Promise<Pool[]> {
    console.time('fetching pools SG');
    const pools = await this.poolsSubgraph.fetch();
    console.timeEnd('fetching pools SG');
    const filteredPools = this.filterPools(pools);
    console.time('fetching pools onchain');
    const onchainPools = await getOnChainBalances(
      filteredPools,
      this.multicall,
      this.vault,
      this.provider
    );
    console.timeEnd('fetching pools onchain');

    return onchainPools;
  }

  async fetch(options?: PoolsRepositoryFetchOptions): Promise<Pool[]> {
    const pools = await this.poolsSubgraph.fetch(options);
    const filteredPools = this.filterPools(pools);
    const onchainPools = await getOnChainBalances(
      filteredPools,
      this.multicall,
      this.vault,
      this.provider
    );
    return onchainPools;
  }

  async find(id: string, forceRefresh = false): Promise<Pool | undefined> {
    return await this.findBy('id', id, forceRefresh);
  }

  async findBy(
    param: PoolAttribute,
    value: string,
    forceRefresh = false
  ): Promise<Pool | undefined> {
    if (!this.pools || forceRefresh) {
      this.pools = this.fetchDefault();
    }

    return (await this.pools).find((pool) => pool[param] == value);
  }

  async all(): Promise<Pool[]> {
    if (!this.pools) {
      this.pools = this.fetchDefault();
    }
    return this.pools;
  }

  async where(filter: (pool: Pool) => boolean): Promise<Pool[]> {
    if (!this.pools) {
      this.pools = this.fetchDefault();
    }

    return (await this.pools).filter(filter);
  }
}
