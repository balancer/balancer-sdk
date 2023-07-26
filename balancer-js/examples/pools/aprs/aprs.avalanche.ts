/**
 * Display APRs
 * 
 * Run command:
 * yarn example ./examples/pools/aprs/aprs.avalanche.ts
 */
import { BalancerSDK, Network } from '@balancer-labs/sdk';

const sdk = new BalancerSDK({
  network: Network.AVALANCHE,
  rpcUrl: 'https://rpc.ankr.com/avalanche',
});

const { pools } = sdk;

const main = async () => {
  const pool = await pools.find(
    '0x3bde1563903ebb564ca37d5736afbb850929cfd7000200000000000000000017'
  );

  console.log(pool);

  if (pool) {
    const apr = await pools.apr(pool);
    console.log(pool.id, apr);
  }
};

main();
