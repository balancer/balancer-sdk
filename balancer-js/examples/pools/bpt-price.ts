import { BalancerSDK } from '@balancer-labs/sdk';

const sdk = new BalancerSDK({
  network: 1,
  rpcUrl: 'https://rpc.ankr.com/eth',
  coingecko: {
    coingeckoApiKey: 'CG-ViHyrfvtLz2WSCJzm59TfGow',
    isDemoApiKey: true,
  },
});

const bptPriceExample = async () => {
  const poolId =
    '0x26cc136e9b8fd65466f193a8e5710661ed9a98270002000000000000000005ad';
  const pool = await sdk.pools.find(poolId);
  if (!pool) {
    throw new Error('Pool not found');
  }
  const bptPrice = await sdk.pools.bptPrice(pool);
  console.log('bpt price: ', bptPrice);
};

bptPriceExample().catch((error) => console.error(error));
