/**
 * Display APRs for pool ids hardcoded under `const ids`
 * Run command: yarn example ./examples/pools/aprs/aprs.ethereum.ts
 */
import { BalancerSDK } from '@balancer-labs/sdk';

const sdk = new BalancerSDK({
  network: 1,
  rpcUrl: 'https://rpc.ankr.com/eth',
});

const { pools } = sdk;

const main = async () => {
  const list = (await pools.all())
    // .filter((p) => p.id === '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014')
    .sort((a, b) => parseFloat(b.totalLiquidity) - parseFloat(a.totalLiquidity))
    .slice(0, 30);

  list.forEach(async (pool) => {
    try {
      const apr = await pools.apr(pool);
      console.log(pool.id, apr);
    } catch (e) {
      console.log(e);
    }
  });
};

main();
