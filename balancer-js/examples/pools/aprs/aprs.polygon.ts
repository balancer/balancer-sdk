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
    '0x216690738aac4aa0c4770253ca26a28f0115c595000000000000000000000b2c'
  );

  if (pool) {
    const apr = await pools.apr(pool);
    console.log(pool.id, apr);
  }
};

main();
