import dotenv from 'dotenv';
dotenv.config();
import { expect } from 'chai';
import { cloneDeep } from 'lodash';
import { JsonRpcProvider } from '@ethersproject/providers';

import {
  BALANCER_NETWORK_CONFIG,
  Network,
  Pool,
  PoolsSubgraphRepository,
} from '@/.';

import { getOnChainBalances, getOnChainPools } from './onChainData';

// yarn test:only ./src/modules/sor/pool-data/onChainData.spec.ts
describe('getOnChainPools', async function () {
  this.timeout(40000);
  let pools: Pool[];
  let provider: JsonRpcProvider;
  const network = Network.POLYGON;
  const url = BALANCER_NETWORK_CONFIG[network].urls.subgraph;
  const rpcUrl = `https://polygon-mainnet.infura.io/v3/${process.env.INFURA}`;

  before(async function () {
    provider = new JsonRpcProvider(rpcUrl);
    const poolsRepo = new PoolsSubgraphRepository({
      url,
      chainId: network,
    });
    pools = await poolsRepo.all();
  });

  it('should fetch onchain pools using queries helper contract', async function () {
    const onChainPools = await getOnChainPools(
      cloneDeep(pools),
      BALANCER_NETWORK_CONFIG[network].addresses.contracts.poolDataQueries,
      BALANCER_NETWORK_CONFIG[network].addresses.contracts.multicall,
      provider
    );
    expect(onChainPools.length).to.be.gt(0);
  });

  it('should fetch onchain pools using multicall', async function () {
    const onChainBalances = await getOnChainBalances(
      cloneDeep(pools),
      BALANCER_NETWORK_CONFIG[network].addresses.contracts.multicall,
      BALANCER_NETWORK_CONFIG[network].addresses.contracts.vault,
      provider
    );
    expect(onChainBalances.length).to.be.gt(0);
  });
});
