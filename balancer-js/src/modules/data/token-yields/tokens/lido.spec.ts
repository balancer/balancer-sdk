import { expect } from 'chai';
import { lido, yieldTokens } from './lido';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

const mockedResponse = {
  data: { smaApr: '1' },
};

describe('lido apr', () => {
  let mock: MockAdapter;

  before(() => {
    mock = new MockAdapter(axios);
    mock
      .onGet('https://lido-aprs-proxy.balancer.workers.dev/?network=1')
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
