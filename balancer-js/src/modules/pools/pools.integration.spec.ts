import { expect } from 'chai';
import { BalancerSDK, Network, PoolWithMethods } from '@/.';
import { AddressZero, Zero } from '@ethersproject/constants';
import { bn } from '@/lib/utils';

const rpcUrl = 'http://127.0.0.1:8545';
const network = Network.MAINNET;
const sdk = new BalancerSDK({ network, rpcUrl });
const { pools, contracts } = sdk;
const { balancerHelpers } = contracts;

const ethStEth =
  '0x32296969ef14eb0c6d29669c550d4a0449130230000200000000000000000080';

describe('pools module', () => {
  describe('methods', () => {
    let pool: PoolWithMethods | undefined;
    before(async () => {
      pool = await pools.find(ethStEth);
    });

    it('gets query function params', async () => {
      if (!pool) {
        return false;
      }
      const params = pool.buildQueryJoinExactIn({
        sender: AddressZero,
        maxAmountsIn: [bn(1), Zero],
      });
      const join = await balancerHelpers.queryJoin(...params);
      expect(Number(join.bptOut)).to.be.gt(0);
    });
  });
});
