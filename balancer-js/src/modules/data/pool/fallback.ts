import { Pool } from '@/types';
import { PoolAttribute, PoolRepository } from './types';

/**
 * The fallback provider takes multiple PoolRepository's in an array and uses them in order
 * falling back to the next one if a request times out.
 *
 * This is useful for using the Balancer API while being able to fall back to the graph if it is down
 * to ensure Balancer is maximally decentralized.
 **/
export class FallbackPoolRepository implements PoolRepository {
  currentProviderIdx: number;

  constructor(
    private readonly providers: PoolRepository[],
    private timeout = 10000
  ) {
    this.currentProviderIdx = 0;
  }

  async find(id: string): Promise<Pool | undefined> {
    if (this.currentProviderIdx >= this.providers.length) {
      throw new Error('No working providers found');
    }

    let pool;

    try {
      pool = await Promise.race<Pool | undefined>([
        this.providers[this.currentProviderIdx].find(id),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), this.timeout)
        ),
      ]);
    } catch (e) {
      console.error(
        'Provider ' +
          this.currentProviderIdx +
          ' failed, falling back to next provider'
      );
      this.currentProviderIdx++;
      pool = await this.find(id);
    }

    return pool;
  }

  async findBy(
    attribute: PoolAttribute,
    value: string
  ): Promise<Pool | undefined> {
    if (this.currentProviderIdx >= this.providers.length) {
      throw new Error('No working providers found');
    }

    let pool;

    try {
      pool = await Promise.race<Pool | undefined>([
        this.providers[this.currentProviderIdx].findBy(attribute, value),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), this.timeout)
        ),
      ]);
    } catch (e) {
      console.error(
        'Provider ' +
          this.currentProviderIdx +
          ' failed, falling back to next provider'
      );
      this.currentProviderIdx++;
      pool = await this.findBy(attribute, value);
    }

    return pool;
  }
}
