import { expect } from 'chai';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { usdr, yieldTokens } from '@/modules/data/token-yields/tokens/usdr';

const mockedResponse = {
  usdr: '10.00',
};

describe('usdr apr', () => {
  let mock: MockAdapter;

  before(() => {
    mock = new MockAdapter(axios);
    mock
      .onGet('https://generic-apr-proxy.balancer.workers.dev/?provider=usdr')
      .reply(() => [200, mockedResponse]);
  });

  after(() => {
    mock.restore();
  });

  it('is getting fetched', async () => {
    const apr = (await usdr())[yieldTokens.USDR];
    expect(apr).to.eq(1000);
  });
});
