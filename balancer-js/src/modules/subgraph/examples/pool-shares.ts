import dotenv from 'dotenv';
import { createSubgraphClient } from '../subgraph';
import {
    OrderDirection,
    PoolShare_OrderBy,
} from '../generated/balancer-subgraph-types';

dotenv.config();

(async function() {
    
    const POOLSHARE_ID = '0x01abc00e86c7e258823b9a055fd62ca6cf61a163-0x2da1bcb14be26be6812e0e871e8dc4f4c0d92629';
    const POOL_ID = '0x01abc00e86c7e258823b9a055fd62ca6cf61a16300010000000000000000003b'
    const USER_ADDR = '0xba12222222228d8ba445958a75a0704d566bf2c8';
    
    const client = createSubgraphClient(`${process.env.BALANCER_SUBGRAPH_URL}`);

    const poolShare = await client.PoolShare({ id: POOLSHARE_ID });
    console.log(poolShare);

    const poolSharesByUser = await client.PoolShares(
        { 
            where: { userAddress: USER_ADDR, balance_gt: "0" }, 
            orderBy: PoolShare_OrderBy.Balance, 
            orderDirection: OrderDirection.Desc
        });
    console.log(poolSharesByUser);
    
    const poolSharesByPool = await client.PoolShares({ where: { poolId: POOL_ID }, first: 20 });
    console.log(poolSharesByPool);

})();

// npm run examples:run -- ./src/modules/subgraph/examples/pool-shares.ts