import dotenv from 'dotenv';
import { createSubgraphClient } from '../subgraph';

dotenv.config();

(async function() {
    const client = createSubgraphClient(`${process.env.BALANCER_SUBGRAPH_URL}`);

    const poolId = "0x0017c363b29d8f86d82e9681552685f68f34b7e4-0x0000000000000000000000000000000000000000";
    const poolShare = await client.PoolShare({ id: poolId });
    console.log(poolShare);

    const poolShares = await client.PoolShares();
    console.log(poolShares);
})();

// npm run examples:run2 -- .\src\modules\subgraph\examples\pool-shares.ts
