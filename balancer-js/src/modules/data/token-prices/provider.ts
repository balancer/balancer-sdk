import type { Findable, Price } from '@/types';
import { AaveRates } from './aave-rates';
import { CoingeckoPriceRepository } from './coingecko';

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

  async findBy(attribute: string, value: string): Promise<Price | undefined> {
    if (attribute === 'address') {
      return this.find(value);
    } else {
      throw `Token price search by ${attribute} not implemented`;
    }
  }
}
