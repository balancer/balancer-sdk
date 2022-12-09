/* eslint-disable @typescript-eslint/no-empty-function */
import {
  Price,
  Findable,
  TokenPrices,
  Network,
  HistoricalPrices,
} from '@/types';
import axios from 'axios';
import { tokenAddressForPricing } from '@/lib/utils';

const HOUR = 60 * 60;

/**
 * Simple coingecko price source implementation. Configurable by network and token addresses.
 */
export class CoingeckoHistoricalPriceRepository implements Findable<Price> {
  prices: TokenPrices = {};
  nativePrice?: Promise<Price>;
  urlBase: string;

  constructor(private chainId: Network = 1) {
    this.urlBase = `https://api.coingecko.com/api/v3/coins/${this.platform(
      chainId
    )}/contract/%TOKEN_ADDRESS%/market_chart/range?vs_currency=usd`;
  }

  private fetch(
    address: string,
    timestamp: number,
    { signal }: { signal?: AbortSignal } = {}
  ): Promise<HistoricalPrices> {
    console.time(`fetching coingecko historical for ${address}`);
    const url = this.urlRange(address, timestamp);
    return axios
      .get<HistoricalPrices>(url, { signal })
      .then(({ data }) => {
        return data;
      })
      .finally(() => {
        console.timeEnd(`fetching coingecko historical for ${address}`);
      });
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
