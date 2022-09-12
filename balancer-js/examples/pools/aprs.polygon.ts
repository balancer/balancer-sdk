/**
 * Display APRs for pool ids hardcoded under `const ids`
 * Run command: yarn examples:run ./examples/pools/aprs.ts
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
    '0x0297e37f1873d2dab4487aa67cd56b58e2f27875000100000000000000000002'
  );

  if (pool) {
    const apr = await pools.apr(pool);
    console.log(pool.id, apr);
  }
};

main();
