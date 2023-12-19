/* eslint-disable @typescript-eslint/no-empty-function */
import {
  Price,
  Findable,
  TokenPrices,
  Network,
  HistoricalPrices,
  CoingeckoConfig,
} from '@/types';
import axios, { AxiosError } from 'axios';
import { tokenAddressForPricing } from '@/lib/utils';

const HOUR = 60 * 60;

/**
 * Simple coingecko price source implementation. Configurable by network and token addresses.
 */
export class CoingeckoHistoricalPriceRepository implements Findable<Price> {
  prices: TokenPrices = {};
  nativePrice?: Promise<Price>;
  urlBase: string;
  apiKey?: string;

  constructor(private chainId: Network = 1, coingecko?: CoingeckoConfig) {
    this.urlBase = `https://${
      coingecko?.coingeckoApiKey && !coingecko.isDemoApiKey ? 'pro-' : ''
    }api.coingecko.com/api/v3/coins/${this.platform(
      chainId
    )}/contract/%TOKEN_ADDRESS%/market_chart/range?vs_currency=usd`;
    this.apiKey = coingecko?.coingeckoApiKey;
  }

  private async fetch(
    address: string,
    timestamp: number,
    { signal }: { signal?: AbortSignal } = {}
  ): Promise<HistoricalPrices> {
    const url = this.urlRange(address, timestamp);
    console.time(`fetching coingecko historical for ${address}`);
    try {
      const { data } = await axios.get<HistoricalPrices>(url, {
        signal,
        headers: { 'x-cg-pro-api-key': this.apiKey ?? '' },
      });
      console.timeEnd(`fetching coingecko historical for ${address}`);
      console.log(data);
      return data;
    } catch (error) {
      console.timeEnd(`fetching coingecko historical for ${address}`);
      if ((error as AxiosError).isAxiosError) {
        throw new Error(
          'Error fetching historical token prices from coingecko - ' +
            (error as AxiosError).message +
            ' - ' +
            (error as AxiosError).response?.statusText
        );
      }
      throw new Error('Unknown Error: ' + error);
    }
  }

  /* eslint-disable @typescript-eslint/no-unused-vars */
  async find(address: string): Promise<Price | undefined> {
    throw `Historic price requires point-in-time timestamp, please use findBy(address, timestamp)`;
  }

  async findBy(
    inputAddress: string,
    timestamp: number
  ): Promise<Price | undefined> {
    const address = tokenAddressForPricing(inputAddress, this.chainId);
    const response = await this.fetch(address, timestamp);

    return {
      usd: `${response.prices[0][1]}`,
    };
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
      case 100:
        return 'xdai';
    }

    return '2';
  }

  private urlRange(address: string, timestamp: number): string {
    const range: { from: number; to: number } = {
      from: timestamp - HOUR,
      to: timestamp + HOUR,
    };
    return `${this.urlBase.replace('%TOKEN_ADDRESS%', address)}&from=${
      range.from
    }&to=${range.to}`;
  }
}
