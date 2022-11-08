import { cloneDeep } from 'lodash';
import {
  SubgraphPoolBase,
  parseToPoolsDict,
  PoolDictionary,
  SubgraphToken,
  PoolDataService,
} from '@balancer-labs/sor';

import { AssetHelpers } from '@/lib/utils';

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
      const assetHelpers = new AssetHelpers(this.wrappedNativeAsset);
      for (const pool of list) {
        // Sort tokens here
        // tokens must have same order as pool getTokens
        const [sortedTokensList, sortedTokens] = assetHelpers.sortTokens(
          pool.tokensList,
          pool.tokens
        );
        pool.tokensList = sortedTokensList;
        pool.tokens = sortedTokens as SubgraphToken[];
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

  /**
   * Converts Subgraph array into PoolDictionary
   * @param refresh
   * @returns
   */
  async poolsDictionary(refresh = false): Promise<PoolDictionary> {
    if (refresh || Object.keys(this.poolsDict).length === 0) {
      const poolsArray = await this.all(refresh);
      this.poolsDict = parseToPoolsDict(poolsArray, 0);
    }
    return this.poolsDict;
  }
}
