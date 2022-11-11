/**
 * Display APRs for pool ids hardcoded under `const ids`
 * Run command: yarn examples:run ./examples/pools/aprs.arbitrum.ts
 */
import dotenv from 'dotenv';
import type { Pool } from '../../src/types';
import { BalancerSDK } from '../../src/modules/sdk.module';

dotenv.config();

const sdk = new BalancerSDK({
  network: 42161,
  rpcUrl: process.env.ARBITRUM_RPC_URL || 'https://rpc.ankr.com/arbitrum', // WARNING: ankr fails for multicall
});

const { pools } = sdk;

const main = async () => {
  // const id = '0x651e00ffd5ecfa7f3d4f33d62ede0a97cf62ede2000200000000000000000006';
  // const pool = (await pools.find(id)) as Pool;
  // const apr = await pools.apr(pool);
  // console.log(pool.id, apr);

  const list = (
    await pools.where(
      (pool) =>
        pool.poolType != 'Element' &&
        pool.poolType != 'AaveLinear' &&
        pool.poolType != 'LiquidityBootstrapping'
    )
  )
    .sort((a, b) => parseFloat(b.totalLiquidity) - parseFloat(a.totalLiquidity))
    .slice(0, 30)

  list.forEach(async (pool) => {
    try {
      const apr = await pools.apr(pool)
      console.log(pool.id, apr)
    } catch (e) {
      console.log(e)
    }
  });
};

main();
