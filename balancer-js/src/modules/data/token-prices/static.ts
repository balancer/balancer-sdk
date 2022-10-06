import { Findable, Price, TokenPrices } from '@/types';

export class StaticTokenPriceProvider implements Findable<Price> {
  tokenPrices: TokenPrices;
  constructor(tokenPrices: TokenPrices) {
    this.tokenPrices = Object.fromEntries(
      Object.entries(tokenPrices).map(([address, price]) => {
        return [address.toLowerCase(), price];
      })
    );
  }

  async find(address: string): Promise<Price | undefined> {
    const lowercaseAddress = address.toLowerCase();
    const price = this.tokenPrices[lowercaseAddress];
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
