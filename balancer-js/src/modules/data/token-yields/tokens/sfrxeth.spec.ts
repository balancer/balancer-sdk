import { expect } from 'chai';
import { sfrxETH, yieldTokens } from './sfrxeth';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

const mockedResponse = {
  sfrxethApr: '1',
};

describe('rocketpool apr', () => {
  let mock: MockAdapter;

  before(() => {
    mock = new MockAdapter(axios);
    mock
      .onGet('https://api.frax.finance/v2/frxeth/summary/latest')
      .reply(() => [200, mockedResponse]);
  });

  after(() => {
    mock.restore();
  });

  it('is getting fetched', async () => {
    const apr = (await sfrxETH())[yieldTokens.sfrxETH];
    expect(apr).to.eq(100);
  });
});
