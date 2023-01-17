import dotenv from 'dotenv';
import {
  Pool,
  createSubgraphClient,
  Pool_OrderBy,
  OrderDirection,
} from '@/modules/subgraph/subgraph';
import { SubgraphHelper } from './subgraphHelper';
import { BALANCER_NETWORK_CONFIG } from '@/lib/constants/config';
import { Network } from '@/lib/constants/network';
import { expect } from 'chai';

dotenv.config();

const network = Network.MAINNET;
const url = BALANCER_NETWORK_CONFIG[network].urls.subgraph;
const subgraphHelper = new SubgraphHelper(url);

let poolsSingleCall: Pool[] = [];

async function oldFetch(url: string): Promise<Pool[]> {
  const client = createSubgraphClient(url);
  console.time('oldFetch');
  const { pool0, pool1000, pool2000 } = await client.AllPools({
    where: { swapEnabled: true, totalShares_gt: '0.000000000001' },
    orderBy: Pool_OrderBy.TotalLiquidity,
    orderDirection: OrderDirection.Desc,
  });
  console.timeEnd('oldFetch');

  return [...pool0, ...pool1000, ...pool2000] as Pool[];
}

describe('subgraph tests', () => {
  it('fetches all pools with single call', async () => {
    poolsSingleCall = await subgraphHelper.allPools();
    expect(poolsSingleCall.length).to.be.greaterThan(0);
  });
  it('fetches all pools with old fetch', async () => {
    const poolsOldFetch = await oldFetch(url);
    expect(poolsSingleCall.length).to.eq(poolsOldFetch.length);
  });
  it('use default filter', async () => {
    const pools = await subgraphHelper.allPools({
      queryOptions: {
        where: { swapEnabled: false },
      },
    });
    expect(pools.length).to.eq(0);
  });
  it('dont use default filter', async () => {
    const pools = await subgraphHelper.allPools(
      {
        queryOptions: {
          where: { swapEnabled: false },
        },
      },
      false
    );
    expect(pools.length).to.be.greaterThan(0);
    pools.forEach((p) => expect(p.swapEnabled).to.be.false);
  });
}).timeout(300000);
// yarn test:only ./src/modules/data/pool/subgraph/utils/subgraphHelper.test.ts
