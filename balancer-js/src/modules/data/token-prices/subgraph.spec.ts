import { expect } from 'chai';
import { SubgraphPriceRepository } from './subgraph';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { BALANCER_NETWORK_CONFIG } from '@/lib/constants/config';

const url = BALANCER_NETWORK_CONFIG[1].urls.subgraph;

const mockedResponse = {
  data: {
    tokens: [
      {
        address: '0x028171bca77440897b824ca71d1c56cac55b68a3',
        latestUSDPrice: 1,
      },
      {
        address: '0x3ed3b47dd13ec9a98b44e6204a523e766b225811',
        latestUSDPrice: 1,
      },
      {
        address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
        latestUSDPrice: 1,
      },
      {
        address: '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56',
        latestUSDPrice: 1,
      },
    ],
  },
};

const addresses = mockedResponse.data.tokens.map((t) => t.address);

const repository = new SubgraphPriceRepository(url, 1);

describe('subgraph price repository', () => {
  let mock: MockAdapter;

  before(() => {
    mock = new MockAdapter(axios);
    mock.onPost(url).reply(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve([200, mockedResponse]), 10);
        })
    );
  });

  after(() => {
    mock.restore();
  });

  it('finds prices', async () => {
    const [price1, price2, price3, price4, price5, price6] = await Promise.all([
      repository.find(addresses[0]),
      repository.find(addresses[0].toUpperCase()),
      repository.find(addresses[1]),
      repository.find(addresses[2]),
      repository.find(addresses[3]),
      repository.find(addresses[3]),
    ]);
    expect(price1?.usd).to.eq(1);
    expect(price2?.usd).to.eq(1);
    expect(price3?.usd).to.eq(1);
    expect(price4?.usd).to.eq(1);
    expect(price5?.usd).to.eq(1);
    expect(price6?.usd).to.eq(1);
  });
});
