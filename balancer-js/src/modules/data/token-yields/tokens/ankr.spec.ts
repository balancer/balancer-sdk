import { expect } from 'chai';
import { url, ankr, yieldTokens } from './ankr';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

const mockedResponse = {
  services: [
    {
      serviceName: 'eth',
      apy: '1.000000000000000000',
    },
  ],
};

describe('idle ankr eth apr', () => {
  let mock: MockAdapter;

  before(() => {
    mock = new MockAdapter(axios);
    mock.onGet(url).reply(() => [200, mockedResponse]);
  });

  after(() => {
    mock.restore();
  });

  it('is getting fetched', async () => {
    const apr = (await ankr())[yieldTokens.ankrEth];
    expect(apr).to.eq(100);
  });
});
