import { Price, Findable, TokenPrices } from '@/types';
import { wrappedTokensMap as aaveWrappedMap } from '../token-yields/tokens/aave';
import axios from 'axios';

/**
 * Simple coingecko price source implementation. Configurable by network and token addresses.
 */
export class CoingeckoPriceRepository implements Findable<Price> {
  prices: TokenPrices = {};
  fetching: { [address: string]: Promise<TokenPrices> } = {};
  urlBase: string;
  baseTokenAddresses: string[];

  constructor(tokenAddresses: string[], chainId = 1) {
    this.baseTokenAddresses = tokenAddresses.map((a) => a.toLowerCase());
    this.urlBase = `https://api.coingecko.com/api/v3/simple/token_price/${this.platform(
      chainId
    )}?vs_currencies=usd,eth`;
  }

  fetch(address: string): { [address: string]: Promise<TokenPrices> } {
    const addresses = this.addresses(address);
    const prices = axios
      .get(this.url(addresses))
      .then(({ data }) => {
        addresses.forEach((address) => {
          delete this.fetching[address];
        });
        this.prices = {
          ...this.prices,
          ...(Object.keys(data).length == 0 ? { [address]: {} } : data),
        };
        return this.prices;
      })
      .catch((error) => {
        console.error(error);
        return this.prices;
      });
    return Object.fromEntries(addresses.map((a) => [a, prices]));
  }

  async find(address: string): Promise<Price | undefined> {
    const lowercaseAddress = address.toLowerCase();
    const unwrapped = unwrapToken(lowercaseAddress);
    if (Object.keys(this.fetching).includes(unwrapped)) {
      await this.fetching[unwrapped];
    } else if (!Object.keys(this.prices).includes(unwrapped)) {
      this.fetching = {
        ...this.fetching,
        ...this.fetch(unwrapped),
      };
      await this.fetching[unwrapped];
    }

    return this.prices[unwrapped];
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
      case 42:
      case 31337:
        return 'ethereum';
      case 137:
        return 'polygon-pos';
      case 42161:
        return 'arbitrum-one';
    }

    return '2';
  }

  private url(addresses: string[]): string {
    return `${this.urlBase}&contract_addresses=${addresses.join(',')}`;
  }

  private addresses(address: string): string[] {
    if (this.baseTokenAddresses.includes(address)) {
      return this.baseTokenAddresses;
    } else {
      return [address];
    }
  }
}

const unwrapToken = (wrappedAddress: string) => {
  const lowercase = wrappedAddress.toLocaleLowerCase();

  if (Object.keys(aaveWrappedMap).includes(lowercase)) {
    return aaveWrappedMap[lowercase as keyof typeof aaveWrappedMap].aToken;
  } else {
    return lowercase;
  }
};
