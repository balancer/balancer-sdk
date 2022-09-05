import { lido, yieldTokens as lidoTokens } from './tokens/lido';
import { aave, yieldTokens as aaveTokens } from './tokens/aave';
import { overnight, yieldTokens as overnightTokens } from './tokens/overnight';
import { Findable } from '../types';

/**
 * Common interface for fetching APR from external sources
 *
 * @param address is optional, used when same source, eg: aave has multiple tokens and all of them can be fetched in one call.
 */
export interface AprFetcher {
  (): Promise<{ [address: string]: number }>;
}

const yieldSourceMap: { [address: string]: AprFetcher } = Object.fromEntries([
  ...Object.values(lidoTokens).map((k) => [k, lido]),
  ...Object.values(aaveTokens).map((k) => [k, aave]),
  ...Object.values(overnightTokens).map((k) => [k, overnight]),
]);

export class TokenYieldsRepository implements Findable<number> {
  private yields: { [address: string]: number } = {};

  constructor(private sources = yieldSourceMap) {}

  async fetch(address: string): Promise<void> {
    const tokenYields = await this.sources[address]();
    this.yields = {
      ...this.yields,
      ...tokenYields,
    };
  }

  async find(address: string): Promise<number | undefined> {
    const lowercase = address.toLocaleLowerCase();
    if (
      Object.keys(this.sources).includes(lowercase) &&
      !Object.keys(this.yields).includes(lowercase)
    ) {
      await this.fetch(address);
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
