import { BalancerSDK, Network } from '../../src';
import { InvestType } from '../../src/modules/subgraph/generated/balancer-subgraph-types';
import { PoolJoinExit } from '../../src/modules/data/pool-joinExit';

// Balancer subgraph : https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-polygon-v2

// npm run examples:run -- ./examples/data/pool-joinExit.ts

const sdk = new BalancerSDK({
  network: Network.POLYGON,
  rpcUrl: '',
});
const { poolJoinExits } = sdk.data;

const format = (result: PoolJoinExit[]): string => {
  return result
    .map(
      (it) =>
        `${it.poolId}\t${it.type}\t${new Date(
          it.timestamp * 1000
        ).toLocaleString()}`
    )
    .join('\n');
};

(async function () {
  const USER_ADDR = '0xdfe6e354ce787944e67cc04ad4404a43f3112a10';
  const POOL_ID =
    '0x36128d5436d2d70cab39c9af9cce146c38554ff0000100000000000000000008';
  let result;

  result = await poolJoinExits.findByPool(POOL_ID, 5);
  if (result.length) {
    const item = result[0];
    console.log(
      `Pool JoinExit by Pool Id:\n${item.type}\t${new Date(
        item.timestamp * 1000
      ).toLocaleString()}\t${item.tokens}`
    );
  }

  result = await poolJoinExits.findByUser(USER_ADDR, 5);
  console.log(`Pool JoinExit by User:\n${format(result)}`);

  const poolId = result[0].poolId;

  result = await poolJoinExits.query({
    where: { pool: poolId, sender: USER_ADDR },
  });
  console.log(`Pool JoinExit Query by PoolId and User:\n${format(result)}`);

  result = await poolJoinExits.findJoins(USER_ADDR, poolId);
  console.log(
    `Pool JoinExit Query by PoolId and User and Type Join:\n${format(result)}`
  );

  result = await poolJoinExits.findExits(USER_ADDR, poolId);
  console.log(
    `Pool JoinExit Query by PoolId and User and Type Exit:\n${format(result)}`
  );
})();
