import { TokenPriceService } from '@balancer-labs/sor';
import axios from 'axios';
import { BALANCER_NETWORK_CONFIG } from '@/lib/constants/config';
import { Network, BalancerNetworkConfig } from '@/types';

export class CoingeckoTokenPriceService implements TokenPriceService {
  constructor(private readonly chainId: number) {}

  public async getNativeAssetPriceInToken(
    tokenAddress: string
  ): Promise<string> {
    const ethPerToken = await this.getTokenPriceInNativeAsset(tokenAddress);

    // We get the price of token in terms of ETH
    // We want the price of 1 ETH in terms of the token base units
    return `${1 / parseFloat(ethPerToken)}`;
  }

  /**
   * @dev Assumes that the native asset has 18 decimals
   * @param tokenAddress - the address of the token contract
   * @returns the price of 1 ETH in terms of the token base units
   */
  async getTokenPriceInNativeAsset(tokenAddress: string): Promise<string> {
    const endpoint = `https://api.coingecko.com/api/v3/simple/token_price/${this.platformId}?contract_addresses=${tokenAddress}&vs_currencies=${this.nativeAssetId}`;

    const { data } = await axios.get(endpoint, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (
      data[tokenAddress.toLowerCase()] === undefined ||
      data[tokenAddress.toLowerCase()][this.nativeAssetId] === undefined
    ) {
      throw Error('No price returned from Coingecko');
    }

    return data[tokenAddress.toLowerCase()][this.nativeAssetId];
  }

  private get platformId(): string {
    const networkConfig: BalancerNetworkConfig =
      BALANCER_NETWORK_CONFIG[this.chainId as Network];
    return networkConfig.thirdParty.coingecko.platformId || '2';
  }

  private get nativeAssetId(): string {
    const networkConfig: BalancerNetworkConfig =
      BALANCER_NETWORK_CONFIG[this.chainId as Network];
    return networkConfig.thirdParty.coingecko.nativeAssetId || '';
  }
}
