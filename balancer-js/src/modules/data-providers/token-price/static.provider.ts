import { TokenPriceData } from '@/types';
import { TokenPriceProvider } from './provider.interface';

export class StaticTokenPriceProvider implements TokenPriceProvider {
    constructor(private tokenPrices: TokenPriceData[]) {}

    find(address: string): TokenPriceData | undefined {
        return this.tokenPrices.find((tokenPrice) => {
            return tokenPrice.address.toLowerCase() === address.toLowerCase();
        });
    }
}
