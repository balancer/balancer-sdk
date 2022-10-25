/* eslint-disable @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any */
import { Findable } from '@/types';

export abstract class AbstractSubgraphRepository<T, A>
  implements Findable<T, A>
{
  protected abstract mapType(subgraphFragment: any): T;

  abstract query(args: any): Promise<T[]>;

  async get(args: any): Promise<T | undefined> {
    const result = await this.query(args);
    return result?.length > 0 ? result[0] : undefined;
  }

  async find(id: string): Promise<T | undefined> {
    return this.get({ where: { id: id } });
  }

  async findBy(attribute: A, value: string): Promise<T | undefined> {
    return this.get({ where: { [String(attribute)]: value } });
  }

  async findAllBy(
    attribute: A,
    value: string,
    first = 1000,
    skip = 0
  ): Promise<T[]> {
    const args = {
      where: { [String(attribute)]: value },
      first: first,
      skip: skip,
    };
    return this.query(args);
  }
}
