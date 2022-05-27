import { TokenPrice } from '@/types';

export interface TokenPriceProvider {
    find: (address: string) => Promise<TokenPrice | undefined>;
}
