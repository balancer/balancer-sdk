import { Token } from '@/types';
import { TokenProvider } from './provider.interface';

export class StaticTokenProvider implements TokenProvider {
    constructor(private tokens: Token[]) {}

    get(address: string): Token | undefined {
        return this.tokens.find((token) => {
            token.address === address;
        });
    }

    getBySymbol(symbol: string): Token | undefined {
        return this.tokens.find((token) => {
            token.symbol === symbol;
        });
    }
}
