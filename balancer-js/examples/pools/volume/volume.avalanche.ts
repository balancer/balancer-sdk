/**
 * Display APRs for pool ids hardcoded under `const ids`
 *
 * Run command:
 * yarn example ./examples/pools/volume/volume.avalanche.ts
 */
import { BalancerSDK } from '@balancer-labs/sdk';

const sdk = new BalancerSDK({
  network: 43114,
  rpcUrl: 'https://avalanche.public-rpc.com',
});

const { pools } = sdk;

const main = async () => {
  const pool = await pools.find(
    '0xa1d14d922a575232066520eda11e27760946c991000000000000000000000012'
  );

  if (pool) {
    const volume = await pools.volume(pool);
    console.table([
      {
        id: pool.id,
        type: pool.poolType,
        totalVolume: pool.totalSwapVolume,
        volume,
      },
    ]);
  }
};

main();
