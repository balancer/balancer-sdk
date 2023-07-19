// yarn example examples/pools/sor.queries.ts
import { BalancerSDK, GraphQLArgs, GraphQLQuery, Network } from '@/index';
import { ADDRESSES } from '@/test/lib/constants';
import { FORK_NODES, RPC_URLS } from '@/test/lib/utils';
import { JsonRpcProvider } from '@ethersproject/providers';

const testRemoteRPC = async (
  network: Network.MAINNET | Network.ZKEVM,
  blockNumber: number,
  tokenOut: string,
  filterSubgraphPools: boolean
) => {
  console.log('\nTesting remote rpc on chain: ', network);
  const jsonRpcUrl = FORK_NODES[network];

  const { swaps } = new BalancerSDK({
    network,
    rpcUrl: jsonRpcUrl,
    subgraphQuery: filterSubgraphPools
      ? getSubgraphQuery(tokenOut, blockNumber)
      : undefined,
  });
  await swaps.fetchPools();
  const pools = swaps.getPools();
};

const testLocalRPC = async (
  network: Network.MAINNET | Network.ZKEVM,
  blockNumber: number,
  tokenOut: string,
  filterSubgraphPools: boolean
) => {
  console.log('\nTesting local fork on chain: ', network);
  const jsonRpcUrl = FORK_NODES[network];

  const rpcUrl = RPC_URLS[network];
  const provider = new JsonRpcProvider(rpcUrl, network);

  await provider.send('hardhat_reset', [
    {
      forking: {
        jsonRpcUrl,
        blockNumber,
      },
    },
  ]);

  const { swaps } = new BalancerSDK({
    network,
    rpcUrl,
    subgraphQuery: filterSubgraphPools
      ? getSubgraphQuery(tokenOut, blockNumber)
      : undefined,
  });
  await swaps.fetchPools();
  const pools = swaps.getPools();
};

const getSubgraphQuery = (tokenOut: string, blockNumber: number) => {
  const subgraphArgs: GraphQLArgs = {
    first: 20,
    where: {
      tokensList: {
        contains: [tokenOut],
      },
    },
    orderBy: 'totalLiquidity',
    orderDirection: 'desc',
    block: {
      number: blockNumber,
    },
  };
  const subgraphQuery: GraphQLQuery = { args: subgraphArgs, attrs: {} };
  return subgraphQuery;
};

const testFetchPools = async (filterSubgraphPools: boolean) => {
  let network: Network.MAINNET | Network.ZKEVM;
  let blockNumber: number;
  let addresses: any;
  let tokenOut: string;

  network = Network.MAINNET;
  blockNumber = 17727390;
  addresses = ADDRESSES[network];
  tokenOut = addresses.wstETH.address;
  await testLocalRPC(network, blockNumber, tokenOut, filterSubgraphPools);
  await testRemoteRPC(network, blockNumber, tokenOut, filterSubgraphPools);

  network = Network.ZKEVM;
  blockNumber = 2737984;
  addresses = ADDRESSES[network];
  tokenOut = addresses.wstETH.address;
  await testLocalRPC(network, blockNumber, tokenOut, filterSubgraphPools);
  await testRemoteRPC(network, blockNumber, tokenOut, filterSubgraphPools);
};

testFetchPools(true);
// testFetchPools(false);
