import { expect } from 'chai';
import { JsonRpcProvider } from '@ethersproject/providers';
import { Zero } from '@ethersproject/constants';
import { LiquidityGaugesMulticallRepository } from './multicall';
import { LiquidityGaugesSubgraphRepository } from './subgraph';
import { BALANCER_NETWORK_CONFIG } from '@/lib/constants/config';
import { Multicall, Multicall__factory } from '@/contracts';
import { BigNumber } from '@ethersproject/bignumber';

const gaugeAddresses = [
  '0x1e916950a659da9813ee34479bff04c732e03deb', // stMATIC-bb-a-WMATIC-BPT-gauge
  '0x956074628a64a316086f7125074a8a52d3306321', // MaticX-bb-a-WMATIC-BPT-gauge
  '0xb95397a17acbb5824535ebe69cd9dcf8fa7afc50', // wstETH-bb-a-WETH-BPT-gauge
];

const mockFetcher = (aggregate: () => Promise<[BigNumber, string[]]>) => {
  const callStatic = {
    aggregate,
  };

  const multicall = { callStatic } as unknown as Multicall;

  return new LiquidityGaugesMulticallRepository(multicall, 1);
};

const fetcher = mockFetcher(() =>
  Promise.resolve([
    Zero,
    new Array(gaugeAddresses.length).fill(
      BigNumber.from(String(1e18)).toString()
    ),
  ])
);

describe('Liquidity gauge multicall', () => {
  it('is fetching total supplies', async () => {
    const totalSupplies = await fetcher.getTotalSupplies(gaugeAddresses);

    expect(Object.keys(totalSupplies).length).to.eq(3);
    expect(totalSupplies[gaugeAddresses[0]]).to.satisfy((n: number) => n >= 0);
  });

  it('is fetching working supplies', async () => {
    const workingSupplies = await fetcher.getWorkingSupplies(gaugeAddresses);

    expect(Object.keys(workingSupplies).length).to.eq(3);
    expect(workingSupplies[gaugeAddresses[0]]).to.satisfy(
      (n: number) => n >= 0
    );
  });

  it('is fetching inflation rates', async () => {
    const inflationRates = await fetcher.getInflationRates(gaugeAddresses);

    expect(Object.keys(inflationRates).length).to.eq(3);
    expect(inflationRates[gaugeAddresses[0]]).to.satisfy((n: number) => n >= 0);
  });

  describe('with all gauges from subgraph', () => {
    const provider = new JsonRpcProvider('http://127.0.0.1:8545', 1);
    const multicall = Multicall__factory.connect(
      BALANCER_NETWORK_CONFIG[1].addresses.contracts.multicall,
      provider
    );
    const fetcher = new LiquidityGaugesMulticallRepository(multicall, 1);

    const gauges = new LiquidityGaugesSubgraphRepository(
      'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-gauges'
    );

    let gaugeAddresses: string[];

    before(async () => {
      const list = await gauges.fetch();
      gaugeAddresses = list.map((g) => g.id);
    });

    it('is fetching reward counts', async () => {
      const rewardCounts = await fetcher.getRewardCounts(gaugeAddresses);

      expect(rewardCounts[Object.keys(rewardCounts)[0]]).to.be.gte(0);
    }).timeout(60000);

    it('is fetching reward data', async () => {
      const rewardData = await fetcher.getRewardData(gaugeAddresses);
      const firstToken = rewardData[Object.keys(rewardData)[0]];

      expect(firstToken[Object.keys(firstToken)[0]].token).to.eq(
        '0x0000000000000000000000000000000000000000'
      );
    }).timeout(60000);
  });
});
