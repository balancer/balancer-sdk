/**
 * Display APRs for pool ids hardcoded under `const ids`
 * Run command: yarn examples:run ./examples/pools/aprs.polygon.ts
 */
import dotenv from 'dotenv';
import { BalancerSDK } from '../../src/modules/sdk.module';

dotenv.config();

const sdk = new BalancerSDK({
  network: 137,
  rpcUrl: `${process.env.ALCHEMY_URL?.replace(
    'eth-mainnet',
    'polygon-mainnet.g'
  )}`,
});

const { pools } = sdk;

const main = async () => {
  const pool = await pools.find(
    '0x8159462d255c1d24915cb51ec361f700174cd99400000000000000000000075d'
  );

  if (pool) {
    const apr = await pools.apr(pool);
    console.log(pool.id, apr);
  }
};

main();
