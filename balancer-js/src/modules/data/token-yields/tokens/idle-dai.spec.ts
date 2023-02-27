import { expect } from 'chai';
import { url, idleDai, yieldTokens } from './idle-dai';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

const mockedResponse = [
  {
    idleRate: '1000000000000000000',
  },
];

describe('idle dai apr', () => {
  let mock: MockAdapter;

  before(() => {
    mock = new MockAdapter(axios);
    mock.onGet(url).reply(() => [200, mockedResponse]);
  });

  after(() => {
    mock.restore();
  });

  it('is getting fetched', async () => {
    const apr = (await idleDai())[yieldTokens.dai];
    expect(apr).to.eq(100);
  });
});
