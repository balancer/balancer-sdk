import dotenv from 'dotenv';
dotenv.config();
import { expect } from 'chai';
import { cloneDeep } from 'lodash';
import { BALANCER_NETWORK_CONFIG, Network, PoolsSubgraphRepository } from '@/.';
import { getOnChainBalancesNew, getOnChainBalances } from './onChainData';
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
    const onchain = await getOnChainBalancesNew(
      cloneDeep(pools),
      '0x84813aA3e079A665C0B80F944427eE83cBA63617',
      '',
      provider
    );
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
    expect(onchain).to.deep.eq(onchainOri);
    expect(onchain.length).to.be.greaterThan(0);
  });
});
