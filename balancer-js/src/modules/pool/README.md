# Pool

A pool is a stateful class that holds pool information and provides functions to calculate
information about the pool such as its total liquidity or current APR.

Most of the logic for pools is implemented in the pools module as it 
contains the static functions that perform the logic. While this class is mostly
state mangement and data retrieval. 


## Liquidity Calculation

```js
import { BalancerSDK, Pool } from '@balancer/sdk';

const pool = new Pool(...configParams)
const totalLiquidity = await pool.liquidity.calcTotal();
