import { BalancerSDK } from '../../src';

const sdk = new BalancerSDK({
  network: 1,
  rpcUrl: 'https://eth-rpc.gateway.pokt.network',
});

const { pools } = sdk;

const main = async () => {
  [
    '0xa13a9247ea42d743238089903570127dda72fe4400000000000000000000035d',
  ].forEach(async (poolId) => {
    const pool = await pools.find(poolId);
    if (pool) {
      const liquidity = await pools.liquidity(pool);
      console.log(pool.totalShares, pool.totalLiquidity, liquidity);
    }
  });
};

main();
