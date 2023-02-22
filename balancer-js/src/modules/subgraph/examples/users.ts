/* eslint-disable @typescript-eslint/no-unused-vars */
import * as dotenv from 'dotenv';
import { createSubgraphClient } from '../subgraph';
import {
  OrderDirection,
  User_OrderBy,
} from '../generated/balancer-subgraph-types';

dotenv.config();

async function subgraphQueries() {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const client = createSubgraphClient(process.env.BALANCER_SUBGRAPH_URL!);

  const { pools } = await client.Pools();

  const { user } = await client.User({ id: 'user-address' });
  const { users } = await client.Users({
    first: 5,
    orderBy: User_OrderBy.SharesOwned,
    orderDirection: OrderDirection.Desc,
  });
}
