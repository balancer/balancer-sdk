import { TokenPrice } from '@/types';

export interface TokenPriceProvider {
    find: (address: string) => TokenPrice | undefined;
}
