import { BalancerSDK } from '@balancer-labs/sdk'

const sdk = new BalancerSDK({
  network: 1,
  rpcUrl: 'https://rpc.ankr.com/eth',
});

(() => {
  [
    '0x32296969ef14eb0c6d29669c550d4a0449130230000200000000000000000080',
  ].forEach(async (poolId) => {
    const pool = await sdk.pools.find(poolId);
    if (pool) {
      const fees = await sdk.pools.fees(pool);
      console.log(fees);
    }
  })
})();

// yarn example ./examples/pools/fees.ts
