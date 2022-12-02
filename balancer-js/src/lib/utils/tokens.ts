import { Token, TokenPrices, Network } from '@/types';
import { TOKENS } from '@/lib/constants/tokens';
import { wrappedTokensMap as aaveWrappedMap } from '@/modules/data/token-yields/tokens/aave';

export function tokensToTokenPrices(tokens: Token[]): TokenPrices {
  const tokenPrices: TokenPrices = {};
  tokens.forEach((token) => {
    if (token.price) {
      tokenPrices[token.address] = token.price;
    }
  });

  return tokenPrices;
}

export function tokenAddressForPricing(
  address: string,
  chainId: Network
): string {
  let a = address.toLowerCase();
  a = addressMapIn(a, chainId);
  a = unwrapToken(a, chainId);

  return a;
}

/**
 * Maps testnet tokens, eg: on Göreli to a mainnet one.
 * Used to get the pricing information on networks not supported by a price feed.
 *
 * @param address Address on a testnet network
 */
export const addressMapIn = (address: string, chainId: Network): string => {
  const addressMap = TOKENS(chainId).PriceChainMap;
  return (addressMap && addressMap[address.toLowerCase()]) || address;
};

/**
 * Finds an underlying token address for a wrapped one
 *
 * @param wrappedAddress
 * @param chainId
 * @returns underlying token address
 */
export const unwrapToken = (
  wrappedAddress: string,
  chainId: Network
): string => {
  const lowercase = wrappedAddress.toLocaleLowerCase();

  const aaveChain = chainId as keyof typeof aaveWrappedMap;
  if (
    aaveWrappedMap[aaveChain] != undefined &&
    aaveWrappedMap[aaveChain] != null
  ) {
    // Double if to avoid skipping just to at after compile: Object.keys()?.includes
    if (Object.keys(aaveWrappedMap[aaveChain]).includes(lowercase)) {
      return aaveWrappedMap[aaveChain][
        lowercase as keyof typeof aaveWrappedMap[typeof aaveChain]
      ].aToken;
    } else {
      return lowercase;
    }
  } else {
    return lowercase;
  }
};
