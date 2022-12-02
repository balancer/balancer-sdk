import { BalancerError, BalancerErrorCode } from '@/balancerErrors';
import type { Findable, Price } from '@/types';
import { AaveRates } from './aave-rates';
import { CoingeckoPriceRepository } from './coingecko';
import { SubgraphPriceRepository } from './subgraph';

export type HistoricalPriceRequest = {
  address: string;
  timestamp: number;
};

export class TokenPriceProvider implements Findable<Price> {
  constructor(
    private coingeckoRepository: CoingeckoPriceRepository,
    private subgraphRepository: SubgraphPriceRepository,
    private aaveRates: AaveRates
  ) {}

  async find(address: string): Promise<Price | undefined> {
    let price;
    try {
      price = await this.coingeckoRepository.find(address);
      if (!price?.usd) {
        price = await this.subgraphRepository.find(address);
      }
    } catch (err) {
      console.error(err);
    }
    const rate = (await this.aaveRates.getRate(address)) || 1;
    if (price && price.usd) {
      return {
        ...price,
        usd: (parseFloat(price.usd) * rate).toString(),
      };
    } else {
      return price;
    }
  }

  async findBy<V = string | HistoricalPriceRequest>(
    attribute: string,
    value: V
  ): Promise<Price | undefined> {
    if (attribute === 'address') {
      return this.find(String(value));
    }
    throw `Token price search by ${attribute} not implemented`;
  }
}

export class TokenHistoricalPriceProvider implements Findable<Price> {
  constructor(
    private coingeckoRepository: CoingeckoPriceRepository,
    private aaveRates: AaveRates
  ) {}

  /**
   * get the historical price at time of call
   *
   * @param address the token address
   */
  async find(address: string): Promise<Price | undefined> {
    return this.findByTimestamp(address, Math.floor(Date.now() / 1000));
  }

  /**
   * get the historical price at the given timestamp.
   *
   * @param address the token address
   * @param timestamp the UNIX timestamp
   * @private
   */
  private async findByTimestamp(
    address: string,
    timestamp: number
  ): Promise<Price | undefined> {
    const price = await this.coingeckoRepository.findHistorical(
      address,
      timestamp
    );
    const rate = (await this.aaveRates.getRate(address)) || 1;
    if (price && price.usd) {
      return {
        ...price,
        usd: (parseFloat(price.usd) * rate).toString(),
      };
    } else {
      return price;
    }
  }

  async findBy<V = string | HistoricalPriceRequest>(
    attribute: string,
    value: V
  ): Promise<Price | undefined> {
    if (attribute === 'address') {
      return this.find(String(value));
    }
    if (attribute === 'timestamp') {
      if (!value) throw new BalancerError(BalancerErrorCode.NO_VALUE_PARAMETER);
      const req = value as unknown as HistoricalPriceRequest;
      return this.findByTimestamp(req.address, req.timestamp);
    }
    throw `Token price search by ${attribute} not implemented`;
  }
}
