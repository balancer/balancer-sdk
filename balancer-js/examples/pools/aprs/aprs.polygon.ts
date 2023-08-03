/**
 * Display APRs
 *
 * Run command:
 * yarn example ./examples/pools/aprs/aprs.polygon.ts
 */
import { BalancerSDK } from '@balancer-labs/sdk';

const sdk = new BalancerSDK({
  network: 137,
  rpcUrl: 'https://rpc.ankr.com/polygon',
});

const { pools } = sdk;

const main = async () => {
  const pool = await pools.find(
    '0xf0ad209e2e969eaaa8c882aac71f02d8a047d5c2000200000000000000000b49'
  );

  if (pool) {
    const apr = await pools.apr(pool);
    console.log(pool.id, apr);
  }
};

main();
