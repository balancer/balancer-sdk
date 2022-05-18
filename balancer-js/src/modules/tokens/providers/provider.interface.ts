import { Token } from '@/types';

export interface TokenProvider {
    get: (address: string) => Token | undefined;
    getBySymbol: (symbol: string) => Token | undefined;
}
