/**
 * Example showing how to query a flash swap to test if it will be profitable.
 *
 * To find pool ids and token adddresses on Kovan:
 * https://thegraph.com/hosted-service/subgraph/balancer-labs/balancer-kovan-v2
 *
 * Gotchas:
-   Both pools must have both assets (tokens) for swaps to work
-   No pool token balances can be zero
-   flashLoanAmount must not add or subtract > 30% of pool liquidity (see [limitations](https://docs.balancer.fi/v/v1/core-concepts/protocol/limitations#v2-limits))
-   If the flash swap isn't profitable, the interal flash loan will fail.

 * Run with:
 * yarn example ./examples/swaps/flash_swap/querySimpleFlashSwap.ts
 */

import { BalancerSDK, Network } from '@balancer-labs/sdk';

const balancer = new BalancerSDK({
  network: Network.MAINNET,
  rpcUrl: 'http://127.0.0.1:8545',
});

async function runQueryFlashSwap() {
  const response = await balancer.swaps.querySimpleFlashSwap({
    flashLoanAmount: '100',
    poolIds: [
      '0xff4ce5aaab5a627bf82f4a571ab1ce94aa365ea6000200000000000000000426',
      '0x76fcf0e8c7ff37a47a799fa2cd4c13cde0d981c90002000000000000000003d2',
    ],
    assets: [
      // usdc
      '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      // dai
      '0x6b175474e89094c44da98b954eedeac495271d0f',
    ],
  });

  console.table(response);
}

// yarn example ./examples/querySimpleFlashSwap.ts
runQueryFlashSwap();
