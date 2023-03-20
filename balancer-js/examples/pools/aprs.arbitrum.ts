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
  const id =
    '0x077794c30afeccdf5ad2abc0588e8cee7197b71a000000000000000000000352';
  const pool = (await pools.find(id)) as Pool;
  const apr = await pools.apr(pool);
  console.log(pool.id, apr);

  // const list = (
  //   await pools.where(
  //     (pool) =>
  //       pool.poolType != 'Element' &&
  //       pool.poolType != 'AaveLinear' &&
  //       pool.poolType != 'LiquidityBootstrapping'
  //   )
  // )
  //   .sort((a, b) => parseFloat(b.totalLiquidity) - parseFloat(a.totalLiquidity))
  //   .slice(0, 30)

  // list.forEach(async (pool) => {
  //   try {
  //     const apr = await pools.apr(pool)
  //     console.log(pool.id, apr)
  //   } catch (e) {
  //     console.log(e)
  //   }
  // });
};

main();
