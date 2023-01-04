import { expect } from 'chai';
import { maticX, yieldTokens } from './maticx';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

const mockedResponse = {
  value: '1',
};

describe('rocketpool apr', () => {
  let mock: MockAdapter;

  before(() => {
    mock = new MockAdapter(axios);
    mock
      .onGet('https://generic-apr-proxy.balancer.workers.dev/?provider=stader')
      .reply(() => [200, mockedResponse]);
  });

  after(() => {
    mock.restore();
  });

  it('is getting fetched', async () => {
    const apr = (await maticX())[yieldTokens.maticX];
    expect(apr).to.eq(100);
  });
});
