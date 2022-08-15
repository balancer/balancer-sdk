import { Findable, Price, TokenPrices } from '@/types';

export class StaticTokenPriceProvider implements Findable<Price> {
  constructor(private tokenPrices: TokenPrices) {}

  async find(address: string): Promise<Price | undefined> {
    const price = this.tokenPrices[address];
    if (!price) return;
    return price;
  }

  async findBy(attribute: string, value: string): Promise<Price | undefined> {
    if (attribute != 'address') {
      return undefined;
    }

    return this.find(value);
  }
}
