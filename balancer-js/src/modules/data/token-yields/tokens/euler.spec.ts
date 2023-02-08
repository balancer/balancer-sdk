import { expect } from 'chai';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { euler, yieldTokens } from '@/modules/data/token-yields/tokens/euler';

const mockedResponse = {
  data: {
    assets: [
      {
        id: '0x6b175474e89094c44da98b954eedeac495271d0f',
        name: 'Dai Stablecoin',
        eTokenAddress: '0xe025e3ca2be02316033184551d4d3aa22024d9dc',
        supplyAPY: '17151955072965490320265604',
      },
      {
        id: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        name: 'USD Coin',
        eTokenAddress: '0xeb91861f8a4e1c12333f42dce8fb0ecdc28da716',
        supplyAPY: '22682267200848807415811509',
      },
      {
        id: '0xdac17f958d2ee523a2206206994597c13d831ec7',
        name: 'Tether USD',
        eTokenAddress: '0x4d19f33948b99800b6113ff3e83bec9b537c85d2',
        supplyAPY: '33108868689548850071843475',
      },
    ],
  },
};

describe('euler apr', () => {
  let mock: MockAdapter;

  before(() => {
    mock = new MockAdapter(axios);
    mock
      .onPost('https://api.thegraph.com/subgraphs/name/euler-xyz/euler-mainnet')
      .reply(() => [200, mockedResponse]);
  });

  after(() => {
    mock.restore();
  });

  it('is getting fetched', async () => {
    const eUSDTapr = (await euler())[yieldTokens.eUSDT];
    expect(eUSDTapr).to.eq(226);
    const eUSDCapr = (await euler())[yieldTokens.eUSDC];
    expect(eUSDCapr).to.eq(331);
    const eDAIapr = (await euler())[yieldTokens.eDAI];
    expect(eDAIapr).to.eq(171);
  });
});
