import { Sor } from '@/modules/sor/sor.module';
import { BalancerSdkConfig } from '@/types';
import {
  SubgraphPoolBase,
  ZERO,
  parseToPoolsDict,
  getSpotPriceAfterSwapForPath,
} from '@balancer-labs/sor';
import { BalancerError, BalancerErrorCode } from '@/balancerErrors';

/**
 * Spot pricing module.
 */
export class Pricing {
  private readonly sor: Sor;

  constructor(config: BalancerSdkConfig, sor?: Sor) {
    if (sor) {
      this.sor = sor;
    } else {
      this.sor = new Sor(config);
    }
  }

  /**
   * Retrieves pools using poolDataService.
   * @returns {boolean} Boolean indicating whether pools data was fetched correctly (true) or not (false).
   */
  async fetchPools(): Promise<boolean> {
    return this.sor.fetchPools();
  }

  /**
   * Get currently saved pools list (fetched using fetchPools()).
   * @returns {SubgraphPoolBase[]} pools list.
   */
  public getPools(): SubgraphPoolBase[] {
    return this.sor.getPools();
  }

  /**
   * Calculates Spot Price for a token pair - finds most liquid path and uses this as reference SP.
   *
   * @param { string } tokenIn Token in address.
   * @param { string } tokenOut Token out address.
   * @param { SubgraphPoolBase[] } pools Optional - Pool data. Will be fetched via dataProvider if not supplied.
   * @returns  { string } Spot price.
   */
  async getSpotPrice(
    tokenIn: string,
    tokenOut: string,
    pools: SubgraphPoolBase[] = []
  ): Promise<string> {
    // If pools list isn't supplied fetch it from swaps data provider
    if (pools.length === 0) {
      await this.fetchPools();
      pools = this.getPools();
    }

    // We find the path for the pair with the highest liquidity and use this as the ref SP
    const poolsDict = parseToPoolsDict(pools, 0);
    // This creates all paths for tokenIn>Out ordered by liquidity
    const paths = this.sor.routeProposer.getCandidatePathsFromDict(
      tokenIn,
      tokenOut,
      0,
      poolsDict,
      4
    );

    if (paths.length === 0)
      throw new BalancerError(BalancerErrorCode.UNSUPPORTED_PAIR);
    return getSpotPriceAfterSwapForPath(paths[0], 0, ZERO).toString();
  }
}
