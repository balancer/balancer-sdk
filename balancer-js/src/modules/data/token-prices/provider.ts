import type { Findable, Price } from '@/types';
import { IAaveRates } from './aave-rates';

export class TokenPriceProvider implements Findable<Price> {
  constructor(
    private coingeckoRepository: Findable<Price>,
    private subgraphRepository: Findable<Price>,
    private aaveRates: IAaveRates
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

  async findBy(attribute: string, value: string): Promise<Price | undefined> {
    if (attribute === 'address') {
      return this.find(value);
    }
    throw `Token price search by ${attribute} not implemented`;
  }
}
