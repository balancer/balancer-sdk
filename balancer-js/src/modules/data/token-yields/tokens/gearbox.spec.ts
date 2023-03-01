// yarn test:only src/modules/data/token-yields/tokens/gearbox.spec.ts
import { expect } from 'chai';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

import { url, gearbox, yieldTokens } from './gearbox';

const mockedResponse = {
  data: [
    {
      dieselToken: '0xc411dB5f5Eb3f7d552F9B8454B2D74097ccdE6E3',
      depositAPY_RAY: '9974132007653562496067491',
    },
    {
      dieselToken: '0x6CFaF95457d7688022FC53e7AbE052ef8DFBbdBA',
      depositAPY_RAY: '10216635327386765706960074',
    },
  ],
};

describe('gearbox apr', () => {
  let mock: MockAdapter;

  before(() => {
    mock = new MockAdapter(axios);
    mock.onGet(url).reply(() => [200, mockedResponse]);
  });

  after(() => {
    mock.restore();
  });

  it('is getting fetched', async () => {
    const aprs = await gearbox();
    expect(aprs[yieldTokens.dUSDC]).to.eq(100);
    expect(aprs[yieldTokens.dDAI]).to.eq(102);
  });
});
