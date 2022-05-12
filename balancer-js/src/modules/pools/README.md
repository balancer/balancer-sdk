# Balancer Pools

Utilities that allow you to load Balancer Pool information.

All the current functions are pure, they don't contain any state, you pass in all information and they return the result. 

## Liquidity Calculation

```js
import { BalancerSDK, Pools } from '@balancer/sdk';

// With full SDK
const balancer = new BalancerSDK(...configParams);

balancer.pools.weighted.liquidity.calcTotal(...);
balancer.pools.stable.liquidity.calcTotal(...);

// or with pools module directly
const pools = new Pools(...configParams);

pools.weighted.liquidity.calcTotal(...);
pools.stable.liquidity.calcTotal(...);
```