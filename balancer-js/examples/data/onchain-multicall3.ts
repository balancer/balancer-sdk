import {
  PoolsSubgraphRepository,
  SubgraphPoolBase,
  Network,
  BALANCER_NETWORK_CONFIG,
  getOnChainBalances as getOnChainBalances3,
} from '@balancer-labs/sdk';
import { JsonRpcProvider } from '@ethersproject/providers';
// import _ from 'lodash';

// Importing legacy multicall fetcher for comparison
// import { getOnChainBalances } from '@/modules/sor/pool-data/onChainData';

const network = Network.POLYGON;

const pools = new PoolsSubgraphRepository({
  url: BALANCER_NETWORK_CONFIG[network].urls.subgraph,
  chainId: network,
  query: {
    args: {
      first: 10,
      skip: 0,
      orderBy: 'totalLiquidity',
      orderDirection: 'desc',
      where: {
        poolType: {
          eq: 'GyroE',
        },
      },
    },
    attrs: {},
  },
});

const providers: Record<number, JsonRpcProvider> = {
  [Network.MAINNET]: new JsonRpcProvider('https://rpc.ankr.com/eth'),
  [Network.POLYGON]: new JsonRpcProvider('https://rpc.ankr.com/polygon'),
  [Network.ARBITRUM]: new JsonRpcProvider('https://rpc.ankr.com/arbitrum'),
  [Network.OPTIMISM]: new JsonRpcProvider('https://rpc.ankr.com/optimism'),
  [Network.BASE]: new JsonRpcProvider('https://rpc.ankr.com/base'),
  [Network.FANTOM]: new JsonRpcProvider('https://rpc.ankr.com/fantom'),
  [Network.ZKEVM]: new JsonRpcProvider('https://rpc.ankr.com/polygon_zkevm'),
};

const provider = providers[network];

/**
 * Recursively finds differences between two objects. Use to compare onchain data from 2 different fetchers.
 */
// function diffObjects(
//   object1: any,
//   object2: any,
//   path = ''
// ): any {
//   const allKeys = _.union(Object.keys(object1), Object.keys(object2));

//   const differences = [];

//   for (const key of allKeys) {
//     const newPath = path ? `${path}.${key}` : key;

//     if (_.isObject(object1[key]) && _.isObject(object2[key])) {
//       differences.push(...diffObjects(object1[key], object2[key], newPath));
//     } else if (!_.isEqual(object1[key], object2[key])) {
//       differences.push({
//         path: newPath,
//         value1: object1[key],
//         value2: object2[key],
//       });
//     }
//   }

//   return differences;
// }

async function main() {
  const subgraph = (await pools.fetch()) as SubgraphPoolBase[];
  const onchain3 = await getOnChainBalances3(
    subgraph,
    '',
    '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
    provider
  );
  console.log(onchain3.length);
  console.log(JSON.stringify(onchain3, null, 2));
  // const onchain = await getOnChainBalances(subgraph, '0xeefba1e63905ef1d7acba5a8513c70307c1ce441', '0xBA12222222228d8Ba445958a75a0704d566BF2C8', provider);
  // console.log(onchain.length)
  // for(const i in subgraph) {
  //   const one = onchain3.find((x) => x.id === subgraph[i].id)
  //   const two = onchain.find((x) => x.id === subgraph[i].id)
  //   console.log('Pool', subgraph[i].id)
  //   if (!two) {
  //     console.log('two missing')
  //     continue
  //   }
  //   console.log(JSON.stringify(findNestedValueDifferences(one, two), null, 2));
  // }
}

main();

// yarn example ./debug/onchain-multicall3.ts
