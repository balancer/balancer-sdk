// yarn test:only ./src/modules/vaultModel/poolModel/join.spec.ts
import dotenv from 'dotenv';
import { expect } from 'chai';
import { cloneDeep } from 'lodash';
import { BigNumber, parseFixed } from '@ethersproject/bignumber';

import { PoolDictionary } from '../poolSource';
import { Network, SubgraphPoolBase } from '@/.';
import { WeightedPoolEncoder } from '@/pool-weighted/encoder';
import { ComposableStablePoolEncoder } from '@/pool-composable-stable/encoder';
import { RelayerModel } from '../relayer';
import { PoolsSource } from '../poolSource';
import { ActionType } from '../vaultModel.module';
import { JoinModel, JoinPoolRequest } from './join';

import { MockPoolDataService } from '@/test/lib/mockPool';
import { ADDRESSES } from '@/test/lib/constants';
import { accuracy } from '@/test/lib/utils';
import { getPoolBalances } from './utils';

import pools_14717479 from '@/test/lib/pools_14717479.json';
import pools_16428572 from '@/test/lib/pools_16428572.json';

dotenv.config();

const poolWeighted = pools_14717479.find(
  (pool) =>
    pool.id ==
    '0xa6f548df93de924d73be7d25dc02554c6bd66db500020000000000000000000e' // B_50WBTC_50WETH
) as unknown as SubgraphPoolBase;

const poolComposableStableNoFee = pools_16428572.find(
  (pool) =>
    pool.id ==
    '0xa13a9247ea42d743238089903570127dda72fe4400000000000000000000035d' // bbausd
) as unknown as SubgraphPoolBase;

describe('joinModel', () => {
  let joinModel: JoinModel;
  let poolsDictionary: PoolDictionary;
  beforeEach(async () => {
    const relayerModel = new RelayerModel();
    joinModel = new JoinModel(relayerModel);
    const poolsRepository = new MockPoolDataService([
      cloneDeep(poolWeighted),
      cloneDeep(poolComposableStableNoFee),
    ]);
    const pools = new PoolsSource(
      poolsRepository,
      ADDRESSES[Network.MAINNET].WETH.address
    );
    poolsDictionary = await pools.poolsDictionary();
  });
  context('joinAction', async () => {
    it('weighted pool - joinExactTokensInForBPTOut', async () => {
      const poolId = poolWeighted.id;
      const tokensIn = [
        ADDRESSES[Network.MAINNET].WBTC.address,
        ADDRESSES[Network.MAINNET].WETH.address,
      ];
      // Should be EVM scaled
      const amountsIn = [
        parseFixed('1.23', 8).toString(),
        parseFixed('10.7', 18).toString(),
      ];
      const encodedUserData = WeightedPoolEncoder.joinExactTokensInForBPTOut(
        amountsIn,
        '0'
      );

      const joinPoolRequest: JoinPoolRequest = {
        actionType: ActionType.Join,
        poolId,
        encodedUserData,
        outputReference: '',
      };
      const joinPool = poolsDictionary[poolId];
      const balancesBefore = getPoolBalances([
        {
          pool: joinPool,
          tokens: [...tokensIn, poolWeighted.address],
        },
      ]);

      const [tokens, amounts] = await joinModel.doJoinPool(
        joinPoolRequest,
        poolsDictionary
      );

      const balancesAfter = getPoolBalances([
        { pool: joinPool, tokens: [...tokensIn, poolWeighted.address] },
      ]);
      expect(tokens).to.deep.eq([...tokensIn, joinPool.address]);
      const expectedAmounts = [
        '123000000',
        '10700000000000000000',
        '-7314757293306744413', // From Tenderly Simulation
      ];
      amounts.forEach((a, i) => {
        expect(
          accuracy(BigNumber.from(a), BigNumber.from(expectedAmounts[i]))
        ).to.be.closeTo(1, 1e-4); // inaccuracy limit of 1 bps
      });

      expect(
        BigNumber.from(balancesAfter[0]).sub(balancesBefore[0]).toString()
      ).to.eq(amountsIn[0]);
      expect(
        BigNumber.from(balancesAfter[1]).sub(balancesBefore[1]).toString()
      ).to.eq(amountsIn[1]);
      // There is an inaccuracy on the math due to unhandled protocol fees on TS math
      expect(
        accuracy(
          BigNumber.from(balancesAfter[2]).sub(balancesBefore[2]),
          BigNumber.from(expectedAmounts[2]).mul(-1)
        )
      ).to.be.closeTo(1, 1e-4);
    });
    it('ComposableStable - joinExactTokensInForBPTOut', async () => {
      const poolId = poolComposableStableNoFee.id;
      const joinPool = poolsDictionary[poolId];
      const tokensIn = [
        ADDRESSES[Network.MAINNET].bbausdt.address,
        ADDRESSES[Network.MAINNET].bbausdc.address,
        ADDRESSES[Network.MAINNET].bbadai.address,
      ];
      // Should be EVM scaled
      const amountsIn = [
        parseFixed('1.23', 18).toString(),
        parseFixed('10.7', 18).toString(),
        parseFixed('1099.5432', 18).toString(),
      ];
      const encodedUserData =
        ComposableStablePoolEncoder.joinExactTokensInForBPTOut(amountsIn, '0');

      const joinPoolRequest: JoinPoolRequest = {
        actionType: ActionType.Join,
        poolId,
        encodedUserData,
        outputReference: '',
      };
      const balancesBefore = getPoolBalances([
        {
          pool: joinPool,
          tokens: tokensIn,
        },
      ]);

      const [tokens, amounts] = await joinModel.doJoinPool(
        joinPoolRequest,
        poolsDictionary
      );

      const balancesAfter = getPoolBalances([
        { pool: joinPool, tokens: tokensIn },
      ]);
      expect(tokens).to.deep.eq([...tokensIn, joinPool.address]);
      expect(
        BigNumber.from(balancesAfter[0]).sub(balancesBefore[0]).toString()
      ).to.eq(amountsIn[0]);
      expect(
        BigNumber.from(balancesAfter[1]).sub(balancesBefore[1]).toString()
      ).to.eq(amountsIn[1]);
      expect(
        BigNumber.from(balancesAfter[2]).sub(balancesBefore[2]).toString()
      ).to.eq(amountsIn[2]);

      expect(amounts.slice(0, -1)).to.deep.eq([
        '1230000000000000000',
        '10700000000000000000',
        '1099543200000000000000',
      ]); // From Tenderly
      const bptOut = BigNumber.from(amounts[3]);
      const expectedBptOut = BigNumber.from('-1110698206088016093708'); // From Tenderly
      expect(bptOut.toString()).to.eq(expectedBptOut.toString());
    });
  });
});
