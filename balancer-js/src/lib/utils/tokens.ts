import { Token, TokenPrices } from '@/types';

export function tokensToTokenPrices(tokens: Token[]): TokenPrices {
  const tokenPrices: TokenPrices = {};
  tokens.forEach((token) => {
    if (token.price) {
      tokenPrices[token.address] = token.price;
    }
  });

  return tokenPrices;
}
