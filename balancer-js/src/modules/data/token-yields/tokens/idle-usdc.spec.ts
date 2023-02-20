import { expect } from 'chai';
import { url, idleUsdc, yieldTokens } from './idle-usdc';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

const mockedResponse = [
  {
    idleRate: '1000000000000000000',
  },
];

describe('idle usdc apr', () => {
  let mock: MockAdapter;

  before(() => {
    mock = new MockAdapter(axios);
    mock.onGet(url).reply(() => [200, mockedResponse]);
  });

  after(() => {
    mock.restore();
  });

  it('is getting fetched', async () => {
    const apr = (await idleUsdc())[yieldTokens.usdc];
    expect(apr).to.eq(100);
  });
});
