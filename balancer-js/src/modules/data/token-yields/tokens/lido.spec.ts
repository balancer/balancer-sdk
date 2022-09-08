import { expect } from 'chai';
import { lido, yieldTokens } from './lido';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

const mockedResponse = {
  data: { eth: '1', steth: '1' },
};

describe('lido apr', () => {
  let mock: MockAdapter;

  before(() => {
    mock = new MockAdapter(axios);
    mock
      .onGet('https://stake.lido.fi/api/apr')
      .reply(() => [200, mockedResponse]);
  });

  after(() => {
    mock.restore();
  });

  it('is getting fetched', async () => {
    const apr = (await lido())[yieldTokens.stETH];
    expect(apr).to.eq(100);
  });
});
