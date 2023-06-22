import dotenv from 'dotenv';
dotenv.config();
import { expect } from 'chai';
import { cloneDeep } from 'lodash';
import { BALANCER_NETWORK_CONFIG, Network, PoolsSubgraphRepository } from '@/.';
import { getOnChainPools } from './onChainData';
import { JsonRpcProvider } from '@ethersproject/providers';

// yarn test:only ./src/modules/sor/pool-data/onChainData.spec.ts
describe('getOnChainPools', async function () {
  it('should fetch onchain pools', async function () {
    const network = Network.POLYGON;
    const rpcUrl = `https://polygon-mainnet.infura.io/v3/${process.env.INFURA}`;
    const provider = new JsonRpcProvider(rpcUrl);
    const url = BALANCER_NETWORK_CONFIG[network].urls.subgraph;
    const poolsRepo = new PoolsSubgraphRepository({
      url,
      chainId: network,
    });
    const pools = await poolsRepo.all();
    const onChainPools = await getOnChainPools(
      cloneDeep(pools),
      BALANCER_NETWORK_CONFIG[network].addresses.contracts.poolDataQueries,
      BALANCER_NETWORK_CONFIG[network].addresses.contracts.multicall,
      provider
    );
    expect(onChainPools.length).to.be.gt(0);
  }).timeout(40000);
});
