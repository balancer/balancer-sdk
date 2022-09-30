import { Network } from '../../src/index';
import { BalancerSDK } from '../../src/modules/sdk.module';

const sdk = new BalancerSDK({ 
    network: Network.GOERLI, 
    rpcUrl: '' 
  });
const { pools } = sdk.data;

async function main() {

  let result;

  result = await pools.all();
  console.log('Retrieve all pools', result);

  const POOL_IDs = [ 
        '0xfa1575c57d887e93f37a3c267a548ede008458b3000200000000000000000088',
        '0x7dd80638c6d8e70b4f7c9a417164b748d8aa3e480002000000000000000000e1' ];
  result = await pools.where(pool => POOL_IDs.includes(pool.id));
  console.log('Filter pools by attributes', result);
}

main();

// npm run examples:exec -- ./examples/data/pools.ts