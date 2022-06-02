import { TokenPriceService } from '@balancer-labs/sor';
import { SubgraphClient } from '@/modules/subgraph/subgraph';
import { keyBy } from 'lodash';

export class SubgraphTokenPriceService implements TokenPriceService {
  private readonly weth: string;

  constructor(private readonly client: SubgraphClient, weth: string) {
    //the subgraph addresses are all toLowerCase
    this.weth = weth.toLowerCase();
  }

  public async getNativeAssetPriceInToken(
    tokenAddress: string
  ): Promise<string> {
    const ethPerToken = await this.getLatestPriceInEthFromSubgraph(
      tokenAddress
    );

    if (!ethPerToken) {
      throw Error('No price found in the subgraph');
    }

    // We want the price of 1 ETH in terms of the token base units
    return `${1 / ethPerToken}`;
  }

  public async getLatestPriceInEthFromSubgraph(
    tokenAddress: string
  ): Promise<number | null> {
    tokenAddress = tokenAddress.toLowerCase();

    const { latestPrices } = await this.client.TokenLatestPrices({
      where: { asset_in: [tokenAddress, this.weth] },
    });
    const pricesKeyedOnId = keyBy(latestPrices, 'id');

    //the ids are set as ${asset}-${pricingAsset}
    //first try to find an exact match
    if (pricesKeyedOnId[`${tokenAddress}-${this.weth}`]) {
      return parseFloat(pricesKeyedOnId[`${tokenAddress}-${this.weth}`].price);
    }

    //no exact match, try to traverse the path
    const matchingLatestPrices = latestPrices.filter(
      (price) => price.asset === tokenAddress
    );

    //pick the first one we match on.
    //There is no timestamp on latestPrice, should get introduced to allow for sorting by latest
    for (const tokenPrice of matchingLatestPrices) {
      const pricingAssetPricedInEth =
        pricesKeyedOnId[`${tokenPrice.pricingAsset}-${this.weth}`];

      //1 BAL = 20 USDC, 1 USDC = 0.00025 ETH, 1 BAL = 20 * 0.00025
      if (pricingAssetPricedInEth) {
        return (
          parseFloat(tokenPrice.price) *
          parseFloat(pricingAssetPricedInEth.price)
        );
      }
    }

    return null;
  }
}
