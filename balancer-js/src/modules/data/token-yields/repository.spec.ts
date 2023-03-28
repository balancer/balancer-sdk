import { expect } from 'chai';
import { TokenYieldsRepository } from './repository';
import MockAdapter from 'axios-mock-adapter';
import axios from 'axios';

const url = 'https://mocked.com/';

const mockedResponse = {
  '0xdcb8f34a3ceb48782c9f3f98df6c12119c8d168a': 5171,
  '0x236975da9f0761e9cf3c2b0f705d705e22829886': 460,
  '0xbd2e7f163d7605fa140d873fea3e28a031370363': 272,
};

describe('TokenYieldsRepository', () => {
  let mock: MockAdapter;

  before(() => {
    mock = new MockAdapter(axios);
    mock.onGet(url).reply(() => [200, mockedResponse]);
  });

  after(() => {
    mock.restore();
  });

  it('should be instantiable', () => {
    expect(new TokenYieldsRepository()).instanceOf(TokenYieldsRepository);
  });

  it('should fetch yields', async () => {
    const repo = new TokenYieldsRepository(url);
    const yields = await repo.fetch();
    expect(Object.keys(yields).length).eq(3);
  });

  it('requesting a yield should return the yield', async () => {
    const repo = new TokenYieldsRepository(url);
    const yield1 = await repo.find(
      '0xdcb8f34a3ceb48782c9f3f98df6c12119c8d168a'
    );
    const yield2 = await repo.find(
      '0x236975da9f0761e9cf3c2b0f705d705e22829886'
    );
    const yield3 = await repo.find(
      '0xbd2e7f163d7605fa140d873fea3e28a031370363'
    );

    expect(yield1).eq(5171);
    expect(yield2).eq(460);
    expect(yield3).eq(272);
  });

  it('requesting a yield that does not exist should return 0', async () => {
    const repo = new TokenYieldsRepository(url);
    const yield1 = await repo.find(
      '0x0000000000000000000000000000000000000000'
    );
    expect(yield1).eq(0);
  });

  it('requesting multiple yields should result in a single request', async () => {
    mock.resetHistory();
    const repo = new TokenYieldsRepository(url);
    await repo.find('0xdcb8f34a3ceb48782c9f3f98df6c12119c8d168a');
    await repo.find('0x236975da9f0761e9cf3c2b0f705d705e22829886');
    await repo.find('0xbd2e7f163d7605fa140d873fea3e28a031370363');

    expect(mock.history.get.length).eq(1);
  });
});
