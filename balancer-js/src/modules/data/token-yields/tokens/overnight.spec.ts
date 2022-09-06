import { expect } from 'chai';
import { overnight, yieldTokens } from './overnight';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

describe('overnight apr', () => {
  let mock: MockAdapter;

  before(() => {
    mock = new MockAdapter(axios);
    mock
      .onGet('https://app.overnight.fi/api/balancer/week/apr')
      .reply(() => [200, '0.01']);
  });

  after(() => {
    mock.restore();
  });

  it('is getting fetched', async () => {
    const apr = (await overnight())[yieldTokens.usdcUSDplus];
    expect(apr).to.eq(1);
  });
});
