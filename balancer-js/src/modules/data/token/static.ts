import { Token } from '@/types';
import { TokenAttribute, TokenProvider } from './types';

export class StaticTokenProvider implements TokenProvider {
  constructor(private tokens: Token[]) {}

  async find(address: string): Promise<Token | undefined> {
    return this.tokens.find((token) => {
      return token.address.toLowerCase() === address.toLowerCase();
    });
  }

  async findBy(
    attribute: TokenAttribute,
    value: string
  ): Promise<Token | undefined> {
    return this.tokens.find((token) => {
      return token[attribute] === value;
    });
  }
}
