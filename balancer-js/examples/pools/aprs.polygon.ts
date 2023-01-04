/**
 * Display APRs
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
    '0x726e324c29a1e49309672b244bdc4ff62a270407000200000000000000000702'
  );

  if (pool) {
    const apr = await pools.apr(pool);
    console.log(pool.id, apr);
  }
};

main();
