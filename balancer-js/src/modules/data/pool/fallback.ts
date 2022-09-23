import { Findable } from '../types';
import { Pool } from '@/types';
import {
  PoolAttribute,
  PoolRepository,
  PoolsFallbackRepositoryOptions,
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
  timeout: number;

  constructor(
    private readonly providers: PoolRepository[],
    options: PoolsFallbackRepositoryOptions = {}
  ) {
    this.currentProviderIdx = 0;
    this.timeout = options.timeout || 10000;
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async fallbackQuery(func: string, args: unknown[]): Promise<any> {
    if (this.currentProviderIdx >= this.providers.length) {
      throw new Error('No working providers found');
    }

    let result;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const currentProvider = this.providers[this.currentProviderIdx] as any;
      result = await Promise.race<unknown | undefined>([
        // eslint-disable-next-line prefer-spread
        currentProvider[func].apply(currentProvider, args),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), this.timeout)
        ),
      ]);
    } catch (e: unknown) {
      const message = (e as Error).message;
      if (message === 'timeout') {
        console.error(
          'Provider ' +
            this.currentProviderIdx +
            ' timed out, falling back to next provider'
        );
      } else {
        console.error(
          'Provider ' + this.currentProviderIdx + ' failed with error: ',
          message,
          ', falling back to next provider'
        );
      }
      this.currentProviderIdx++;
      result = await this.fallbackQuery.call(this, func, args);
    }

    return result;
  }
}
