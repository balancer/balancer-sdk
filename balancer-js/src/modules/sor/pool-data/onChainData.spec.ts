import dotenv from 'dotenv';
dotenv.config();
import { expect } from 'chai';
import { cloneDeep } from 'lodash';
import { BALANCER_NETWORK_CONFIG, Network, PoolsSubgraphRepository } from '@/.';
import { getOnChainPools, getOnChainBalances } from './onChainData';
import { JsonRpcProvider } from '@ethersproject/providers';

// yarn test:only ./src/modules/sor/pool-data/onChainData.spec.ts
describe('onChainData', async function () {
  it('should run', async function () {
    const network = Network.POLYGON;
    const rpcUrl = `https://polygon-mainnet.infura.io/v3/${process.env.INFURA}`;
    const provider = new JsonRpcProvider(rpcUrl);
    const url = BALANCER_NETWORK_CONFIG[network].urls.subgraph;
    const poolsRepo = new PoolsSubgraphRepository({
      url,
      chainId: network,
    });
    const pools = await poolsRepo.all();
    console.log(pools.length, 'SG length');
    const onChainPools = await getOnChainPools(
      cloneDeep(pools),
      BALANCER_NETWORK_CONFIG[network].addresses.contracts.poolDataQueries,
      BALANCER_NETWORK_CONFIG[network].addresses.contracts.multicall,
      provider
    );
    expect(onChainPools.length).to.be.gt(0);
    const onchainOri = await getOnChainBalances(
      cloneDeep(pools),
      BALANCER_NETWORK_CONFIG[network].addresses.contracts.multicall,
      BALANCER_NETWORK_CONFIG[network].addresses.contracts.vault,
      provider
    );
    // console.log(onchainOri[0]);
    // console.log('======');
    // console.log(onchain[0]);
    // expect(onchain[0]).to.deep.eq(onchainOri[0]);
    expect(onChainPools).to.deep.eq(onchainOri);
    expect(onChainPools.length).to.be.greaterThan(0);
  });
});
