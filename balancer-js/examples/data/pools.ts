import { BalancerSDK, Network } from '@balancer-labs/sdk';

const sdk = new BalancerSDK({
  network: Network.MAINNET,
  rpcUrl: 'https://rpc.ankr.com/eth',
});

const { pools, poolsOnChain } = sdk.data;

async function main() {
  const POOL_ID1 =
    '0x2d011adf89f0576c9b722c28269fcb5d50c2d17900020000000000000000024d';
  const POOL_ID2 =
    '0x4aa462d59361fc0115b3ab7e447627534a8642ae000100000000000000000158';
  const POOL_IDs = [POOL_ID1, POOL_ID2];

  let result;

  result = await pools.find(POOL_ID1);
  console.log('Fetch pool by id', result);

  result = await pools.all();
  console.log('Fetch all pools', result);

  result = await pools.where((pool) => POOL_IDs.includes(pool.id));
  console.log('Filter pools by attributes', result);

  // Refetch on-chain balances for a given pool
  const pool = await pools.find(POOL_ID1);
  if (!pool) {
    throw new Error('Pool not found');
  }
  for (const idx in pool.tokens) {
    pool.tokens[idx].balance = '0';
  }
  const onchain = await poolsOnChain.refresh(pool);
  console.log('onchain pool', onchain);
}

main();

// yarn example ./examples/data/pools.ts
