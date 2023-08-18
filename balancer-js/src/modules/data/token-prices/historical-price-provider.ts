import type { Findable, Price } from '@/types';
import { IAaveRates } from './aave-rates';

export class HistoricalPriceProvider implements Findable<Price> {
  constructor(
    private coingeckoRepository: Findable<Price>,
    private aaveRates: IAaveRates
  ) {}

  /**
   * get the historical price at time of call
   *
   * @param address the token address
   */
  async find(address: string): Promise<Price | undefined> {
    return this.findBy(address, Math.floor(Date.now() / 1000));
  }

  /**
   * get the historical price at the given timestamp.
   *
   * @param address the token address
   * @param timestamp the UNIX timestamp
   * @private
   */
  async findBy(address: string, timestamp: number): Promise<Price | undefined> {
    const price = await this.coingeckoRepository.findBy(address, timestamp);
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
}
