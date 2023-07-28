/**
 * Display APRs
 *
 * Run command:
 * yarn example ./examples/pools/aprs/aprs.zkevm.ts
 */
import { BalancerSDK } from '@balancer-labs/sdk';

const sdk = new BalancerSDK({
  network: 1101,
  rpcUrl: 'https://rpc.ankr.com/polygon_zkevm',
});

const { pools } = sdk;

const main = async () => {
  const pool = await pools.find(
    '0xe1f2c039a68a216de6dd427be6c60decf405762a00000000000000000000000e'
  );

  if (pool) {
    const apr = await pools.apr(pool);
    console.log(pool.id, apr);
  }
};

main();
