import { TokenPriceService } from '@balancer-labs/sor';
import axios from 'axios';
import { BALANCER_NETWORK_CONFIG } from '@/lib/constants/config';
import { Network, BalancerNetworkConfig, CoingeckoConfig } from '@/types';
import {
  getCoingeckoApiBaseUrl,
  getCoingeckoApiKeyHeaderName,
} from '@/lib/utils/coingecko-api';

export class CoingeckoTokenPriceService implements TokenPriceService {
  private readonly urlBase: string;
  private readonly apiKey: string;
  private readonly coingeckoApiKeyHeaderName: string;
  constructor(private readonly chainId: number, coingecko: CoingeckoConfig) {
    this.urlBase = `${getCoingeckoApiBaseUrl(
      coingecko?.isDemoApiKey
    )}simple/token_price/${this.platformId}?vs_currencies=${
      this.nativeAssetId
    }`;
    this.coingeckoApiKeyHeaderName = getCoingeckoApiKeyHeaderName(
      coingecko?.isDemoApiKey
    );
    this.apiKey = coingecko.coingeckoApiKey;
  }

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
    const endpoint = `${this.urlBase}&contract_addresses=${tokenAddress}`;

    const { data } = await axios.get(endpoint, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        [this.coingeckoApiKeyHeaderName]: this.apiKey ?? '',
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
