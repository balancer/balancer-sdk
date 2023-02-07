import { expect } from 'chai';
import { tessera, yieldTokens } from './tessera';
import { parseEther } from '@ethersproject/units';

const mockedContract = {
  getPoolsUI: () =>
    Promise.resolve([
      {
        stakedAmount: parseEther(String(24 * 365)),
        currentTimeRange: {
          rewardsPerHour: parseEther('1'),
        },
      },
    ]),
};

describe('tessera apr', () => {
  it('is getting fetched', async () => {
    const apr = (await tessera(1, mockedContract))[yieldTokens.sApe];
    expect(apr).to.eq(10000);
  });
});
