import { Token } from '@/types';
import { TokenAttribute, TokenProvider } from './provider.interface';

export class StaticTokenProvider implements TokenProvider {
    constructor(private tokens: Token[]) {}

    find(address: string): Token | undefined {
        return this.tokens.find((token) => {
            return token.address.toLowerCase() === address.toLowerCase();
        });
    }

    findBy(attribute: TokenAttribute, value: string): Token | undefined {
        return this.tokens.find((token) => {
            return token[attribute] === value;
        });
    }
}
