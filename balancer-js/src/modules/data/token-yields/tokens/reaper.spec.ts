import { expect } from 'chai';
import { reaper, yieldTokens } from './reaper';
import { BigNumber } from '@ethersproject/bignumber';

const mockedContract = {
  getAprs: () =>
    Promise.resolve(
      Object.fromEntries(
        Object.keys(yieldTokens).map((coin) => [coin, BigNumber.from('1')])
      )
    ),
};

describe('reaper apr', () => {
  it('is getting fetched', async () => {
    const apr = (await reaper(42161, mockedContract))[yieldTokens.DAI];
    expect(apr).to.eq(1);
  });
});
