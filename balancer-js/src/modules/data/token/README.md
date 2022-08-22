# Tokens

Utilities that allow you to load token information.

The tokens class must have a token provider which defines where the token information
is coming from.

StaticTokenProvider - Token information comes from a pre-set array
CoingeckoTokenProvider - Token information comes from coingecko

## Token Information

```js
import { BalancerSDK, Tokens, StaticTokenProvider, CoingeckoTokenProvider } from '@balancer/sdk';

// With full SDK
const balancer = new BalancerSDK(...configParams);
const tokenProvider = new StaticTokenProvider()

balancer.tokens.setProvider(tokenProvider)
balancer.tokens.get(tokenId);

// or with tokens module directly
const tokenProvider = new CoingeckoTokenProvider()
const tokens = new Tokens();

tokens.setProvider(tokenProvider);
tokens.get(tokenId);
```
