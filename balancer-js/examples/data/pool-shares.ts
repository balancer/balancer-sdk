import { Network } from '../../src/index';
import { BalancerSDK } from '../../src/modules/sdk.module';

const sdk = new BalancerSDK(
  { 
    network: Network.MAINNET, 
    rpcUrl: '' 
  });
const { poolShares } = sdk.data;

(async function() {
  
  const POOLSHARE_ID = '0x01abc00e86c7e258823b9a055fd62ca6cf61a163-0x2da1bcb14be26be6812e0e871e8dc4f4c0d92629';
  const POOL_ID = '0x01abc00e86c7e258823b9a055fd62ca6cf61a16300010000000000000000003b'
  const USER_ADDR = '0xba12222222228d8ba445958a75a0704d566bf2c8';
  
  let result;

  result = await poolShares.find(POOLSHARE_ID);
  console.log('Pool share by id', result);

  result = await poolShares.findByUser(USER_ADDR);
  console.log('Pool shares by user', result);

  result = await poolShares.findByUser(USER_ADDR, 5);
  console.log('Pool shares by user (first 5)', result);

  result = await poolShares.findByPool(POOL_ID);
  console.log('Pool shares by pool', result);

  result = await poolShares.findByPool(POOL_ID, 2, 1);
  console.log('Pool shares by pool (#2 & #3)', result);
    
  result = await poolShares.query({ where: { poolId: POOL_ID,  balance_gt: '0' }, first: 3 });
  console.log('Pool shares subgraph query', result);
  // Balancer subgraph : https://thegraph.com/hosted-service/subgraph/balancer-labs/balancer-v2

})();

// npm run examples:run -- ./examples/data/pool-shares.ts