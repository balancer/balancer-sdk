import { expect } from 'chai';
import { tranchess, yieldTokens } from './tranchess';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { parseEther } from '@ethersproject/units';

const mockedResponse = [
  {
    weeklyAveragePnlPercentage: parseEther('0.01').div(365).toString(),
  },
];

describe('tranchess apr', () => {
  let mock: MockAdapter;

  before(() => {
    mock = new MockAdapter(axios);
    mock
      .onGet(
        'https://generic-apr-proxy.balancer.workers.dev/?provider=tranchess'
      )
      .reply(() => [200, mockedResponse]);
  });

  after(() => {
    mock.restore();
  });

  it('is getting fetched', async () => {
    const apr = (await tranchess())[yieldTokens.qETH];
    expect(apr).to.eq(100);
  });
});
