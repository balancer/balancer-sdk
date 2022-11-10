import dotenv from 'dotenv';
import { createGaugesClient } from '../subgraph';

dotenv.config();

(async function() {
    
    const client = createGaugesClient(`${process.env.GAUGE_SUBGRAPH_URL}`);
    
    const POOL_ADDRESS = '0x06df3b2bbb68adc8b0e302443692037ed9f91b42';

    const poolGauges = await client.PoolGauges({ where: { address: POOL_ADDRESS } });
    console.log(poolGauges);
})();

// npm run examples:run -- ./src/modules/subgraph/examples/pool-gauges.ts
