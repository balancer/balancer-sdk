// yarn test:only src/modules/data/token-yields/tokens/stafi.spec.ts
import { expect } from 'chai';
import { stafi, yieldTokens } from './stafi';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

const mockedResponse = {
  data: {
    stakeApr: '1', // percentage
  },
};

describe('stafi rETH apr', () => {
  let mock: MockAdapter;

  before(() => {
    mock = new MockAdapter(axios);
    mock
      .onGet('https://drop-api.stafi.io/reth/v1/poolData/')
      .reply(() => [200, mockedResponse]);
  });

  after(() => {
    mock.restore();
  });

  it('is getting fetched', async () => {
    const apr = (await stafi())[yieldTokens.rETH];
    expect(apr).to.eq(100); // basis points (bps)
  });
});
