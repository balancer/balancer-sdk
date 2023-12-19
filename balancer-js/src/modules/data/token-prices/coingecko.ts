/* eslint-disable @typescript-eslint/no-empty-function */
import {
  CoingeckoConfig,
  Findable,
  Network,
  Price,
  TokenPrices,
} from '@/types';
import axios, { AxiosError } from 'axios';
import { TOKENS } from '@/lib/constants/tokens';
import { Debouncer, tokenAddressForPricing } from '@/lib/utils';

/**
 * Simple coingecko price source implementation. Configurable by network and token addresses.
 */
export class CoingeckoPriceRepository implements Findable<Price> {
  prices: { [key: string]: Promise<Price> } = {};
  nativePrice?: Promise<Price>;
  urlBase: string;
  baseTokenAddresses: string[];
  debouncer: Debouncer<TokenPrices, string>;
  apiKey?: string;

  constructor(
    tokenAddresses: string[],
    private chainId: Network = 1,
    coingecko?: CoingeckoConfig
  ) {
    this.baseTokenAddresses = tokenAddresses.map(tokenAddressForPricing);
    this.urlBase = `https://api.coingecko.com/api/v3/simple/token_price/${this.platform(
      chainId
    )}?vs_currencies=usd,eth`;
    this.apiKey = coingecko?.coingeckoApiKey;
    this.debouncer = new Debouncer<TokenPrices, string>(
      this.fetch.bind(this),
      200,
      coingecko?.tokensPerPriceRequest ?? 10
    );
  }

  private async fetch(
    addresses: string[],
    { signal }: { signal?: AbortSignal } = {}
  ): Promise<TokenPrices> {
    try {
      const { data } = await axios.get<TokenPrices>(this.url(addresses), {
        signal,
        headers: { ApiKey: this.apiKey ?? '' },
      });
      return data;
    } catch (error) {
      const message = ['Error fetching token prices from coingecko'];
      if ((error as AxiosError).isAxiosError) {
        if ((error as AxiosError).response?.status !== undefined) {
          message.push(`with status ${(error as AxiosError).response?.status}`);
        }
      } else {
        message.push(error as string);
      }
      return Promise.reject(message.join(' '));
    }
  }

  private fetchNative({
    signal,
  }: { signal?: AbortSignal } = {}): Promise<Price> {
    console.time(`fetching coingecko for native token`);
    enum Assets {
      ETH = 'ethereum',
      MATIC = 'matic-network',
      XDAI = 'xdai',
    }
    let assetId: Assets = Assets.ETH;
    if (this.chainId === 137) assetId = Assets.MATIC;
    if (this.chainId === 100) assetId = Assets.XDAI;
    return axios
      .get<{ [key in Assets]: Price }>(
        `https://api.coingecko.com/api/v3/simple/price/?vs_currencies=eth,usd&ids=${assetId}`,
        { signal }
      )
      .then(({ data }) => {
        return data[assetId];
      })
      .catch((error) => {
        const message = ['Error fetching native token from coingecko'];
        if (error.isAxiosError) {
          if (error.response?.status) {
            message.push(`with status ${error.response.status}`);
          }
        } else {
          message.push(error);
        }
        return Promise.reject(message.join(' '));
      })
      .finally(() => {
        console.timeEnd(`fetching coingecko for native token`);
      });
  }

  find(inputAddress: string): Promise<Price | undefined> {
    const address = tokenAddressForPricing(inputAddress, this.chainId);
    if (!this.prices[address]) {
      // Make initial call with all the tokens we want to preload
      if (Object.keys(this.prices).length === 0) {
        for (const baseAddress of this.baseTokenAddresses) {
          this.prices[baseAddress] = this.debouncer
            .fetch(baseAddress)
            .then((prices) => prices[baseAddress]);
        }
      }

      // Handle native asset special case
      if (
        address === TOKENS(this.chainId).Addresses.nativeAsset.toLowerCase()
      ) {
        if (!this.nativePrice) {
          this.prices[address] = this.fetchNative();
        }

        return this.prices[address];
      }

      this.prices[address] = this.debouncer
        .fetch(address)
        .then((prices) => prices[address]);
    }

    return this.prices[address];
  }

  async findBy(attribute: string, value: string): Promise<Price | undefined> {
    if (attribute != 'address') {
      return undefined;
    }

    return this.find(value);
  }

  private platform(chainId: number): string {
    switch (chainId) {
      case 1:
      case 5:
      case 42:
      case 31337:
        return 'ethereum';
      case 100:
        return 'xdai';
      case 137:
        return 'polygon-pos';
      case 250:
        return 'fantom';
      case 1101:
        return 'polygon-zkevm';
      case 8453:
        return 'base';
      case 42161:
        return 'arbitrum-one';
      case 43114:
        return 'avalanche';
    }

    return '2';
  }

  private url(addresses: string[]): string {
    return `${this.urlBase}&contract_addresses=${addresses.join(',')}`;
  }
}
