/**
 * Display APRs for pool ids hardcoded under `const ids`
 * Run command: yarn examples:run ./examples/pools/aprs.arbitrum.ts
 */
import dotenv from 'dotenv';
import { BalancerSDK } from '../../src/modules/sdk.module';

dotenv.config();

const sdk = new BalancerSDK({
  network: 42161,
  rpcUrl: process.env.ARBITRUM_RPC_URL || 'https://rpc.ankr.com/arbitrum', // WARNING: ankr fails for multicall
});

const { pools } = sdk;

const main = async () => {
  const pool = await pools.find(
    '0xfb5e6d0c1dfed2ba000fbc040ab8df3615ac329c000000000000000000000159'
  );

  if (pool) {
    const apr = await pools.apr(pool);
    console.log(pool.id, apr);
  }
};

main();
