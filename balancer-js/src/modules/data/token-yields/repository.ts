import axios from 'axios';
import { Findable } from '@/types';
import { Logger } from '@/lib/utils/logger';

export class TokenYieldsRepository implements Findable<number> {
  private yields?: Promise<{ [address: string]: number }>;

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
      const logger = Logger.getInstance();
      logger.warn(`Failed to fetch yield tokens: ${error}`);
    }

    return aprs;
  }

  async find(address: string): Promise<number> {
    const lc = address.toLocaleLowerCase();
    if (!this.yields) {
      this.yields = this.fetch();
    }

    return this.yields.then((r) => (r[lc] && r[lc] > 0 ? r[lc] : 0));
  }

  async findBy(attribute: string, value: string): Promise<number> {
    if (attribute != 'address') {
      return 0;
    }

    return this.find(value);
  }
}
