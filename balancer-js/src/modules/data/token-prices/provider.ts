import {BalancerError, BalancerErrorCode} from "@/balancerErrors";
import type { Findable, Price } from '@/types';
import { AaveRates } from './aave-rates';
import { CoingeckoPriceRepository } from './coingecko';

export type HistoricalPriceRequest = {
  address: string,
  timestamp: number
}

export class TokenPriceProvider implements Findable<Price> {
  constructor(
    private coingeckoRepository: CoingeckoPriceRepository,
    private aaveRates: AaveRates
  ) {}

  async find(address: string): Promise<Price | undefined> {
    const price = await this.coingeckoRepository.find(address);
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

  async findHistorical(
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

  async findBy<V = string | HistoricalPriceRequest>(attribute: string, value: V): Promise<Price | undefined> {
    if (attribute === 'address') {
      return this.find(String(value));
    }
    if (attribute === 'timestamp') {
      if (!value) throw new BalancerError(BalancerErrorCode.NO_VALUE_PARAMETER);
      const req = value as unknown as HistoricalPriceRequest;
      return this.findHistorical(req.address, req.timestamp);
    }
    throw `Token price search by ${attribute} not implemented`;
  }
}
