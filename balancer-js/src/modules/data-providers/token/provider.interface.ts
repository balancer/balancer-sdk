import { Token } from '@/types';

export type TokenAttribute = 'address' | 'symbol';

export interface TokenProvider {
  find: (address: string) => Promise<Token | undefined>;
  findBy: (
    attribute: TokenAttribute,
    value: string
  ) => Promise<Token | undefined>;
}
