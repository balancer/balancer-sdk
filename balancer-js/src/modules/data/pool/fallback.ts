import { Findable } from '../types';
import { GraphQLQuery, Pool } from '@/types';
import {
  PoolAttribute,
  PoolRepository,
  PoolsRepositoryFetchOptions,
} from './types';

/**
 * The fallback provider takes multiple PoolRepository's in an array and uses them in order
 * falling back to the next one if a request times out.
 *
 * This is useful for using the Balancer API while being able to fall back to the graph if it is down
 * to ensure Balancer is maximally decentralized.
 **/
export class PoolsFallbackRepository implements Findable<Pool, PoolAttribute> {
  currentProviderIdx: number;

  constructor(
    private readonly providers: PoolRepository[],
    private timeout = 10000
  ) {
    this.currentProviderIdx = 0;
  }

  async fetch(options?: PoolsRepositoryFetchOptions): Promise<Pool[]> {
    return this.fallbackQuery('fetch', [options]);
  }

  get currentProvider(): PoolRepository | undefined {
    if (
      !this.providers.length ||
      this.currentProviderIdx >= this.providers.length
    ) {
      return;
    }

    return this.providers[this.currentProviderIdx];
  }

  async find(id: string): Promise<Pool | undefined> {
    return this.fallbackQuery('find', [id]);
  }

  async findBy(
    attribute: PoolAttribute,
    value: string
  ): Promise<Pool | undefined> {
    return this.fallbackQuery('findBy', [attribute, value]);
  }

  async fallbackQuery(func: string, args: any[]): Promise<any> {
    if (this.currentProviderIdx >= this.providers.length) {
      throw new Error('No working providers found');
    }

    let result;

    try {
      const currentProvider = this.providers[this.currentProviderIdx] as any;
      result = await Promise.race<any | undefined>([
        // eslint-disable-next-line prefer-spread
        currentProvider[func].apply(currentProvider, args),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), this.timeout)
        ),
      ]);
    } catch (e: any) {
      if (e.message === 'timeout') {
        console.error(
          'Provider ' +
            this.currentProviderIdx +
            ' timed out, falling back to next provider'
        );
      } else {
        console.error(
          'Provider ' + this.currentProviderIdx + ' failed with error: ',
          e.message,
          ', falling back to next provider'
        );
      }
      this.currentProviderIdx++;
      result = await this.fallbackQuery.call(this, func, args);
    }

    return result;
  }
}
