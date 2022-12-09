import { expect } from 'chai';
import { rocketpool, yieldTokens } from './rocketpool';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

const mockedResponse = {
  yearlyAPR: '1',
};

describe('rocketpool apr', () => {
  let mock: MockAdapter;

  before(() => {
    mock = new MockAdapter(axios);
    mock
      .onGet('https://api.rocketpool.net/api/apr')
      .reply(() => [200, mockedResponse]);
  });

  after(() => {
    mock.restore();
  });

  it('is getting fetched', async () => {
    const apr = (await rocketpool())[yieldTokens.rETH];
    expect(apr).to.eq(100);
  });
});
