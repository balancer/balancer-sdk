import { expect } from 'chai';
import { aave, yieldTokens, wrappedTokensMap } from './aave';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

const mockedResponse = {
  data: {
    reserves: [
      {
        underlyingAsset: wrappedTokensMap[1][yieldTokens[1].waUSDT].underlying,
        liquidityRate: '16633720952291480781459657',
      },
    ],
  },
};

describe('aave apr', () => {
  let mock: MockAdapter;

  before(() => {
    mock = new MockAdapter(axios);
    mock
      .onPost('https://api.thegraph.com/subgraphs/name/aave/protocol-v2')
      .reply(() => [200, mockedResponse]);
  });

  after(() => {
    mock.restore();
  });

  it('is getting fetched', async () => {
    const apr = (await aave(1))[yieldTokens[1].waUSDT];
    expect(apr).to.eq(166);
  });
});

// Mocking for fetch in case we migrate at some point:
// import fetchMock from 'fetch-mock';
// fetchMock.post('https://api.thegraph.com/subgraphs/name/aave/protocol-v2', mockedResponse);
// fetchMock.reset();
