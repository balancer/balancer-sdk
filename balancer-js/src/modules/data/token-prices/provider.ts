import type { Findable, Price } from '@/types';
import { IAaveRates } from './aave-rates';
import { Logger } from '@/lib/utils/logger';

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
        throw new Error('Price not found');
      }
    } catch (err) {
      const logger = Logger.getInstance();
      logger.warn(err as string);
      price = await this.subgraphRepository.find(address);
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
