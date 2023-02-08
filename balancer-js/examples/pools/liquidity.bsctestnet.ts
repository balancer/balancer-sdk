/**
 * Display APRs for pool ids hardcoded under `const ids`
 * Make sure your terminal is in the balancer-js folder and run:
 * yarn examples:run examples/pools/liquidity.bsctestnet
 */
import dotenv from 'dotenv';
import { BalancerSDK } from '@/.';

dotenv.config();

const sdk = new BalancerSDK({
  network: 97,
  rpcUrl: `${process.env.GETBLOCK_TEST_URL}`,
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
