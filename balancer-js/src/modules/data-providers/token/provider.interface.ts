import { Token } from '@/types';

export type TokenAttribute = 'address' | 'symbol';

export interface TokenProvider {
    find: (address: string) => Token | undefined;
    findBy: (attribute: TokenAttribute, value: string) => Token | undefined;
}
