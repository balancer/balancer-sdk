/* eslint-disable @typescript-eslint/no-empty-function */
import { Price, Findable, TokenPrices, Network } from '@/types';
import axios from 'axios';
import { BALANCER_NETWORK_CONFIG } from '@/lib/constants/config';
import { Debouncer, tokenAddressForPricing } from '@/lib/utils';

interface SubgraphPricesResponse {
  data: {
    tokens: [
      {
        address: string;
        latestUSDPrice?: string;
      }
    ];
  };
}

export class SubgraphPriceRepository implements Findable<Price> {
  private subgraphUrl: string;
  prices: { [key: string]: Promise<Price> } = {};
  debouncer: Debouncer<TokenPrices, string>;

  constructor(private chainId: Network = 1) {
    this.subgraphUrl = BALANCER_NETWORK_CONFIG[chainId].urls.subgraph;
    this.debouncer = new Debouncer<TokenPrices, string>(
      this.fetch.bind(this),
      200
    );
  }

  private async fetch(
    addresses: string[],
    { signal }: { signal?: AbortSignal } = {}
  ): Promise<TokenPrices> {
    console.time(`fetching subgraph prices for ${addresses.length} tokens`);
    return axios
      .post<SubgraphPricesResponse>(
        this.subgraphUrl,
        {
          variables: { addresses },
          query: `query($addresses: [String!]) {
            tokens(
              where: {
                id_in: $addresses
              }
            ) {
              address
              latestUSDPrice
            }
          }`,
        },
        { signal }
      )
      .then((response) => response.data.data)
      .then(({ tokens }) =>
        Object.fromEntries(
          tokens.map((token) => [
            token.address,
            { usd: token.latestUSDPrice || undefined },
          ])
        )
      )
      .finally(() => {
        console.timeEnd(
          `fetching subgraph prices for ${addresses.length} tokens`
        );
      });
  }

  async find(inputAddress: string): Promise<Price | undefined> {
    const address = tokenAddressForPricing(inputAddress, this.chainId);
    if (!this.prices[address]) {
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
}
