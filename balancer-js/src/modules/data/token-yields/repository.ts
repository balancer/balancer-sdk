import axios from 'axios';
import { Findable } from '@/types';

export class TokenYieldsRepository implements Findable<number> {
  private yields: { [address: string]: number } = {};

  constructor(private url = 'https://yield-tokens.balancer.workers.dev/') {}

  async fetch(): Promise<void> {
    let aprs = {};

    try {
      const response = await axios.get(this.url);

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
  }

  async find(address: string): Promise<number | undefined> {
    const lowercase = address.toLocaleLowerCase();
    if (Object.keys(this.yields).length == 0) {
      await this.fetch();
    }

    return this.yields[lowercase];
  }

  async findBy(attribute: string, value: string): Promise<number | undefined> {
    if (attribute != 'address') {
      return undefined;
    }

    return this.find(value);
  }
}
