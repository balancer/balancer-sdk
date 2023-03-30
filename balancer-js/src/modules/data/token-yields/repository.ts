import axios from 'axios';
import { Findable } from '@/types';

export class TokenYieldsRepository implements Findable<number> {
  private yields: { [address: string]: Promise<number> } = {};

  constructor(private url = 'https://yield-tokens.balancer.workers.dev/') {}

  async fetch(): Promise<{ [address: string]: number }> {
    let aprs = {};

    try {
      console.time(`fetching token yields`);
      const response = await axios.get(this.url);
      console.timeEnd(`fetching token yields`);

      aprs = response.data as {
        [key: string]: number;
      };
    } catch (error) {
      console.error('Failed to fetch yield tokens:', error);
    }

    this.yields = {
      ...this.yields,
      ...aprs,
    };

    return aprs;
  }

  async find(address: string): Promise<number> {
    const lowercase = address.toLocaleLowerCase();
    if (Object.keys(this.yields).length == 0) {
      this.yields[lowercase] = this.fetch().then((r) => r[lowercase] || 0);
    }

    return this.yields[lowercase] || 0;
  }

  async findBy(attribute: string, value: string): Promise<number> {
    if (attribute != 'address') {
      return 0;
    }

    return this.find(value);
  }
}
