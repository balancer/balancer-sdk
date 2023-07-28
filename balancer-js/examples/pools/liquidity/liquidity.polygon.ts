/**
 * Display liquidity for the pool
 *
 * Run command:
 * yarn example ./examples/pools/liquidity/liquidity.polygon.ts
 */
import { BalancerSDK } from '@balancer-labs/sdk';

const sdk = new BalancerSDK({
  network: 137,
  rpcUrl: 'https://rpc.ankr.com/polygon',
});

const { pools } = sdk;

const main = async () => {
  const pool = await pools.find(
    '0xb797adfb7b268faeaa90cadbfed464c76ee599cd0002000000000000000005ba'
  );

  if (pool) {
    const liquidity = await pools.liquidity(pool);
    console.log(pool.id, pool.poolType, pool.totalLiquidity, liquidity);
  }
};

main();
