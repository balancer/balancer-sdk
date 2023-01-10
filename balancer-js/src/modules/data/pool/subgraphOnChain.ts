import { Findable, Searchable } from '../types';
import { Provider } from '@ethersproject/providers';
import { PoolAttribute, PoolsRepositoryFetchOptions } from './types';
import { GraphQLQuery, Pool } from '@/types';
import { Network } from '@/lib/constants/network';
import { getOnChainBalances } from '../../../modules/sor/pool-data/onChainData';
import { PoolsSubgraphRepository } from './subgraph';

interface PoolsSubgraphOnChainRepositoryOptions {
  url: string;
  chainId: Network;
  provider: Provider;
  multicall: string;
  vault: string;
  blockHeight?: () => Promise<number | undefined>;
  query?: GraphQLQuery;
}

/**
 * Access pools using generated subgraph client and multicall.
 */
export class PoolsSubgraphOnChainRepository
  implements Findable<Pool, PoolAttribute>, Searchable<Pool>
{
  private poolsSubgraph: PoolsSubgraphRepository;
  private provider: Provider;
  private pools?: Promise<Pool[]>;
  private multicall: string;
  private vault: string;
  public skip = 0;

  /**
   * Repository using multicall to get onchain data.
   *
   * @param url subgraph URL
   * @param chainId current network, needed for L2s logic
   * @param blockHeight lazy loading blockHeigh resolver
   * @param multicall multicall address
   * @param valt vault address
   */
  constructor(options: PoolsSubgraphOnChainRepositoryOptions) {
    this.poolsSubgraph = new PoolsSubgraphRepository({
      url: options.url,
      chainId: options.chainId,
      blockHeight: options.blockHeight,
      query: options.query,
    });
    this.provider = options.provider;
    this.multicall = options.multicall;
    this.vault = options.vault;
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
    console.time('fetching pools onchain');
    const onchainPools = await getOnChainBalances(
      pools,
      this.multicall,
      this.vault,
      this.provider
    );
    console.timeEnd('fetching pools onchain');

    return onchainPools;
  }

  async fetch(options?: PoolsRepositoryFetchOptions): Promise<Pool[]> {
    const pools = await this.poolsSubgraph.fetch(options);
    const onchainPools = await getOnChainBalances(
      pools,
      this.multicall,
      this.vault,
      this.provider
    );
    return onchainPools;
  }

  async find(id: string): Promise<Pool | undefined> {
    return await this.findBy('id', id);
  }

  async findBy(param: PoolAttribute, value: string): Promise<Pool | undefined> {
    if (!this.pools) {
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
