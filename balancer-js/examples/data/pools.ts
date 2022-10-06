import { Network } from '../../src/index';
import { BalancerSDK } from '../../src/modules/sdk.module';

const sdk = new BalancerSDK({ 
    network: Network.GOERLI, 
    rpcUrl: '' 
  });
const { pools } = sdk.data;

async function main() {

  const POOL_ID1 = '0xfa1575c57d887e93f37a3c267a548ede008458b3000200000000000000000088';
  const POOL_ID2 = '0x7dd80638c6d8e70b4f7c9a417164b748d8aa3e480002000000000000000000e1';
  const POOL_IDs = [ POOL_ID1, POOL_ID2 ];

  let result;

  result = await pools.find(POOL_ID1);
  console.log('Fetch pool by id', result);

  result = await pools.all();
  console.log('Fetch all pools', result);

  result = await pools.where(pool => POOL_IDs.includes(pool.id));
  console.log('Filter pools by attributes', result);
}

main();

// npm run examples:exec -- ./examples/data/pools.ts