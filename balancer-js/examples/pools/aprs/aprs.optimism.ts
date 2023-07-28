/**
 * Display APRs
 * 
 * Run command:
 * yarn example ./examples/pools/aprs/aprs.optimism.ts
 */
import { BalancerSDK } from '@balancer-labs/sdk';

const sdk = new BalancerSDK({
  network: 10,
  rpcUrl: 'https://rpc.ankr.com/optimism',
});

const { pools } = sdk;

const main = async () => {
  const pool = await pools.find(
    '0x7ca75bdea9dede97f8b13c6641b768650cb837820002000000000000000000d5'
  );

  if (pool) {
    const apr = await pools.apr(pool);
    console.log(pool.id, apr);
  }
};

main();
