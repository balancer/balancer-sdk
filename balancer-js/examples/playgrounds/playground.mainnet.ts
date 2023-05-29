import { BalancerSDK } from '@/modules/sdk.module';
import { GraphQLQuery, Network } from '@/types';
import { parseFixed } from '@ethersproject/bignumber';
import { GraphQLArgs } from '@/lib/graphql';

const network = Network.MAINNET;
const rpcUrl = 'http://127.0.0.1:8545';
const playground = async () => {
  const subgraphArgs: GraphQLArgs = {
    where: {
      swapEnabled: {
        eq: true,
      },
      totalShares: {
        gt: 0.000000000001,
      },
      poolType: { eq: 'Weighted' },
      poolTypeVersion: { eq: 4 },
    },
    orderBy: 'totalLiquidity',
    orderDirection: 'desc',
  };
  const subgraphQuery: GraphQLQuery = { args: subgraphArgs, attrs: {} };
  const customSubgraphUrl =
    'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-v2-beta';

  const balancer = new BalancerSDK({
    network,
    rpcUrl,
    subgraphQuery,
    customSubgraphUrl,
  });

  await balancer.data.poolsForSor.getPools();

  const swapInfo = await balancer.swaps.findRouteGivenIn({
    tokenIn: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    tokenOut: '0xba100000625a3754423978a60c9317c58a424e3d',
    amount: parseFixed('1', 18),
    gasPrice: parseFixed('30000000000', 18),
    maxPools: 200,
  });

  console.log(swapInfo);
  return;
};

playground();
