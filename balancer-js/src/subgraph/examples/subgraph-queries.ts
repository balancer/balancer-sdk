import * as dotenv from 'dotenv';
import { createSubgraphClient } from '../subgraph';
import {
    OrderDirection,
    User_OrderBy,
} from '../generated/balancer-subgraph-types';

dotenv.config();

async function subgraphQueries() {
    const client = createSubgraphClient(process.env.BALANCER_SUBGRAPH_URL!);

    const { pools } = await client.SubgraphPools({ first: 5 });
    const { pools: filteredPools } = await client.SubgraphPools({
        where: { totalLiquidity_gt: '1' },
    });

    const { user } = await client.SubgraphUser({ id: 'user-address' });
    const { users } = await client.SubgraphUsers({
        first: 5,
        orderBy: User_OrderBy.SharesOwned,
        orderDirection: OrderDirection.Desc,
    });
}
