/**
 * Display APRs for pool ids hardcoded under `const ids`
 * 
 * Run command:
 * yarn example ./examples/pools/aprs/aprs.gnosis.ts
 */
import { BalancerSDK, Pool } from '@balancer-labs/sdk';

const sdk = new BalancerSDK({
  network: 100,
  rpcUrl: 'https://rpc.gnosis.gateway.fm',
});

const { pools } = sdk;

const main = async () => {
  const id =
    '0x66f33ae36dd80327744207a48122f874634b3ada000100000000000000000013';
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
