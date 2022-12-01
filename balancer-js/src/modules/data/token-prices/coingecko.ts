/* eslint-disable @typescript-eslint/no-empty-function */
import {
  Price,
  Findable,
  TokenPrices,
  Network,
  HistoricalPrices,
} from '@/types';
import { wrappedTokensMap as aaveWrappedMap } from '../token-yields/tokens/aave';
import axios from 'axios';
import { TOKENS } from '@/lib/constants/tokens';

// Conscious choice for a deferred promise since we have setTimeout that returns a promise
// Some reference for history buffs: https://github.com/petkaantonov/bluebird/wiki/Promise-anti-patterns
interface Promised<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}

const makePromise = <T>(): Promised<T> => {
  let resolve: (value: T) => void = () => {};
  let reject: (reason: unknown) => void = () => {};
  const promise = new Promise<T>((res, rej) => {
    [resolve, reject] = [res, rej];
  });
  return { promise, reject, resolve };
};

const HOUR = 60 * 60;

/**
 * Simple coingecko price source implementation. Configurable by network and token addresses.
 */
export class CoingeckoPriceRepository implements Findable<Price> {
  prices: TokenPrices = {};
  nativePrice?: Promise<Price>;
  urlBase: string;
  urlHistorical: string;
  baseTokenAddresses: string[];

  // Properties used for deferring API calls
  // TODO: move this logic to hooks
  requestedAddresses = new Set<string>(); // Accumulates requested addresses
  debounceWait = 200; // Debouncing waiting time [ms]
  promisedCalls: Promised<TokenPrices>[] = []; // When requesting a price we return a deferred promise
  promisedCount = 0; // New request coming when setTimeout is executing will make a new promise
  timeout?: ReturnType<typeof setTimeout>;
  debounceCancel = (): void => {}; // Allow to cancel mid-flight requests

  constructor(tokenAddresses: string[], private chainId: Network = 1) {
    this.baseTokenAddresses = tokenAddresses.map((a) => this.unwrapToken(a));
    this.urlBase = `https://api.coingecko.com/api/v3/simple/token_price/${this.platform(
      chainId
    )}?vs_currencies=usd,eth`;
    this.urlHistorical = `https://api.coingecko.com/api/v3/coins/${this.platform(
      chainId
    )}/contract/%TOKEN_ADDRESS%/market_chart/range?vs_currency=usd`;
  }

  private fetch(
    addresses: string[],
    { signal }: { signal?: AbortSignal } = {}
  ): Promise<TokenPrices> {
    console.time(`fetching coingecko for ${addresses.length} tokens`);
    return axios
      .get<TokenPrices>(this.url(addresses), { signal })
      .then(({ data }) => {
        return data;
      })
      .finally(() => {
        console.timeEnd(`fetching coingecko for ${addresses.length} tokens`);
      });
  }

  private fetchNative({
    signal,
  }: { signal?: AbortSignal } = {}): Promise<Price> {
    console.time(`fetching coingecko for native token`);
    const assetId = this.chainId === 137 ? 'matic-network' : 'ethereum';
    return axios
      .get<Price>(
        `https://api.coingecko.com/api/v3/simple/price/?vs_currencies=eth,usd&ids=${assetId}`,
        { signal }
      )
      .then(({ data }) => {
        return data;
      })
      .finally(() => {
        console.timeEnd(`fetching coingecko for native token`);
      });
  }

  private debouncedFetch(): Promise<TokenPrices> {
    if (!this.promisedCalls[this.promisedCount]) {
      this.promisedCalls[this.promisedCount] = makePromise<TokenPrices>();
    }

    const { promise, resolve, reject } = this.promisedCalls[this.promisedCount];

    if (this.timeout) {
      clearTimeout(this.timeout);
    }

    this.timeout = setTimeout(() => {
      this.promisedCount++; // any new call will get a new promise
      this.fetch([...this.requestedAddresses])
        .then((results) => {
          resolve(results);
          this.debounceCancel = () => {};
        })
        .catch((reason) => {
          console.error(reason);
        });
    }, this.debounceWait);

    this.debounceCancel = () => {
      if (this.timeout) {
        clearTimeout(this.timeout);
      }
      reject('Cancelled');
      delete this.promisedCalls[this.promisedCount];
    };

    return promise;
  }

  private fetchHistorical(
    address: string,
    timestamp: number,
    { signal }: { signal?: AbortSignal } = {}
  ): Promise<HistoricalPrices> {
    const url = this.urlRange(address, timestamp);
    return axios.get<HistoricalPrices>(url, { signal }).then(({ data }) => {
      return data;
    });
  }

  private debouncedFetchHistorical(
    address: string,
    timestamp: number
  ): Promise<HistoricalPrices> {
    const { promise, resolve, reject } = makePromise<HistoricalPrices>();
    if (this.timeout) {
      clearTimeout(this.timeout);
    }

    this.timeout = setTimeout(() => {
      this.promisedCount++; // any new call will get a new promise
      this.fetchHistorical(address, timestamp)
        .then((results) => {
          resolve(results);
          this.debounceCancel = () => {};
        })
        .catch((reason) => {
          reject(reason);
        });
    }, this.debounceWait);

    this.debounceCancel = () => {
      if (this.timeout) {
        clearTimeout(this.timeout);
      }
      reject('Cancelled');
    };

    return promise;
  }

  async findHistorical(
    address: string,
    timestamp: number
  ): Promise<Price | undefined> {
    const unwrapped = this.unwrapToken(address);
    const promised = await this.debouncedFetchHistorical(unwrapped, timestamp);
    return {
      usd: `${promised.prices[0][1]}`,
    };
  }

  async find(address: string): Promise<Price | undefined> {
    const unwrapped = this.unwrapToken(address);
    if (!this.prices[unwrapped]) {
      // Handle native asset special case
      if (
        unwrapped === TOKENS(this.chainId).Addresses.nativeAsset.toLowerCase()
      ) {
        if (!this.nativePrice) {
          this.nativePrice = this.fetchNative();
        }
        this.prices[unwrapped] = await this.nativePrice;
      } else {
        try {
          let init = false;
          if (Object.keys(this.prices).length === 0) {
            // Make initial call with all the tokens we want to preload
            this.baseTokenAddresses.forEach(
              this.requestedAddresses.add.bind(this.requestedAddresses)
            );
            init = true;
          }
          this.requestedAddresses.add(unwrapped);
          const promised = await this.debouncedFetch();
          this.prices[unwrapped] = promised[unwrapped];
          this.requestedAddresses.delete(unwrapped);
          if (init) {
            this.baseTokenAddresses.forEach((a) => {
              this.prices[a] = promised[a];
              this.requestedAddresses.delete(a);
            });
          }
        } catch (error) {
          console.error(error);
        }
      }
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
      case 5:
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

  private addressMapIn(address: string): string {
    const addressMap = TOKENS(this.chainId).PriceChainMap;
    return (addressMap && addressMap[address.toLowerCase()]) || address;
  }

  private unwrapToken(wrappedAddress: string) {
    return unwrapToken(wrappedAddress, this.chainId);
  }

  private url(addresses: string[]): string {
    return `${this.urlBase}&contract_addresses=${addresses.join(',')}`;
  }

  private urlRange(address: string, timestamp: number): string {
    const range: { from: number; to: number } = {
      from: timestamp - HOUR,
      to: timestamp + HOUR,
    };
    return `${this.urlHistorical.replace('%TOKEN_ADDRESS%', address)}&from=${
      range.from
    }&to=${range.to}`;
  }
}

const unwrapToken = (wrappedAddress: string, chainId: Network) => {
  const lowercase = wrappedAddress.toLocaleLowerCase();

  const aaveChain = chainId as keyof typeof aaveWrappedMap;
  if (
    aaveWrappedMap[aaveChain] != undefined &&
    aaveWrappedMap[aaveChain] != null
  ) {
    // Double if to avoid skipping just to at after compile: Object.keys()?.includes
    if (Object.keys(aaveWrappedMap[aaveChain]).includes(lowercase)) {
      return aaveWrappedMap[aaveChain][
        lowercase as keyof typeof aaveWrappedMap[typeof aaveChain]
      ].aToken;
    } else {
      return lowercase;
    }
  } else {
    return lowercase;
  }
};
