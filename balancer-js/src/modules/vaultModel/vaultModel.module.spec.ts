// yarn test:only ./src/modules/vaultModel/vaultModel.module.spec.ts
import dotenv from 'dotenv';
import { expect } from 'chai';
import { BigNumber, parseFixed } from '@ethersproject/bignumber';
import { Network, SubgraphPoolBase } from '@/.';
import { VaultModel, JoinPool, ActionType } from './vaultModel.module';

import { MockPoolDataService } from '@/test/lib/mockPool';
import { ADDRESSES } from '@/test/lib/constants';

import pools_14717479 from '@/test/lib/pools_14717479.json';
import { PoolBase } from '@balancer-labs/sor';

const pool = pools_14717479.find(
  (pool) =>
    pool.id ==
    '0xa6f548df93de924d73be7d25dc02554c6bd66db500020000000000000000000e' // B_50WBTC_50WETH
) as unknown as SubgraphPoolBase;

dotenv.config();

const poolsRepository = new MockPoolDataService([pool]);
const vaultModel = new VaultModel(poolsRepository);

function getPoolBalances(pool: PoolBase, tokens: string[]): string[] {
  const balances: string[] = [];
  let i = 0;
  while (i <= tokens.length) {
    if (i + 2 > tokens.length) {
      const poolPair = pool.parsePoolPairData(tokens[i], tokens[i - 1]);
      balances.push(poolPair.balanceIn.toString());
    } else {
      const poolPair = pool.parsePoolPairData(tokens[i], tokens[i + 1]);
      balances.push(poolPair.balanceIn.toString());
      balances.push(poolPair.balanceOut.toString());
    }
    i = i + 2;
  }
  return balances;
}

describe('vault model', () => {
  context('instantiation', () => {
    it('instantiate via module', async () => {
      const poolsRepository = new MockPoolDataService([pool]);
      const vaultModel = new VaultModel(poolsRepository);
      const pools = await vaultModel.all();
      expect(pools.length).to.eq(1);
    });

    // it('instantiate via SDK', async () => {
    // const balancer = new BalancerSDK({
    // network: Network.MAINNET,
    // rpcUrl: `https://mainnet.infura.io/v3/${process.env.INFURA}`,
    // });
    //   const pools = await balancer.vaultModel.all();
    //   expect(pools.length).to.be.greaterThan(0);
    // });
  });
  context('joinAction', async () => {
    it('should handle join', async () => {
      const poolId = pool.id;
      const tokensIn = [
        ADDRESSES[Network.MAINNET].WBTC.address,
        ADDRESSES[Network.MAINNET].WETH.address,
      ];
      // Should be EVM scaled
      const amountsIn = [
        parseFixed('1.23', 8).toString(),
        parseFixed('10.7', 18).toString(),
      ];
      const joinPoolRequest: JoinPool = {
        actionType: ActionType.Join,
        poolId,
        amountsIn,
        tokensIn,
      };
      const poolsDictionary = await vaultModel.poolsDictionary();
      const joinPool = poolsDictionary[poolId];
      const balancesBefore = getPoolBalances(joinPool, [
        ...tokensIn,
        pool.address,
      ]);

      const bptOut = await vaultModel.handleJoinPool(joinPoolRequest);

      const balancesAfter = getPoolBalances(joinPool, [
        ...tokensIn,
        pool.address,
      ]);
      expect(BigNumber.from(bptOut).gt(0)).to.be.true;
      expect(
        BigNumber.from(balancesAfter[0]).sub(balancesBefore[0]).toString()
      ).to.eq(amountsIn[0]);
      expect(
        BigNumber.from(balancesAfter[1]).sub(balancesBefore[1]).toString()
      ).to.eq(amountsIn[1]);
      expect(
        BigNumber.from(balancesAfter[2]).sub(balancesBefore[2]).toString()
      ).to.eq(bptOut);
      expect(bptOut).to.eq('7314757264527952668'); // Taken from join module
    });
  });
});
