import { BalancerSDK } from '../../src';

const sdk = new BalancerSDK({
  network: 1,
  rpcUrl: 'https://eth-rpc.gateway.pokt.network',
});

const { pools } = sdk;

(() => {
  [
    '0xa13a9247ea42d743238089903570127dda72fe4400000000000000000000035d',
    // '0x2f4eb100552ef93840d5adc30560e5513dfffacb000000000000000000000334',
  ].forEach(async (poolId) => {
    const pool = await pools.find(poolId);
    if (pool) {
      const liquidity = await pools.liquidity(pool);
      console.table([
        {
          totalShares: pool.totalShares,
          liquidity: liquidity,
          bptPrice: parseFloat(pool.totalShares) / parseFloat(liquidity),
        },
      ]);
    }
  });
})();
