// yarn test:only ./src/modules/vaultModel/poolModel/exit.spec.ts
import dotenv from 'dotenv';
import { expect } from 'chai';
import { cloneDeep } from 'lodash';
import { BigNumber, parseFixed } from '@ethersproject/bignumber';
import { PoolDictionary } from '@balancer-labs/sor';

import { Network, SubgraphPoolBase } from '@/.';
import { PoolType } from '@/types';
import { isSameAddress } from '@/lib/utils';
import { WeightedPoolEncoder } from '@/pool-weighted/encoder';
import { ComposableStablePoolEncoder } from '@/pool-composable-stable/encoder';
import { RelayerModel } from '../relayer';
import { PoolsSource } from '../poolSource';
import { ActionType } from '../vaultModel.module';
import { ExitModel, ExitPoolRequest } from './exit';

import { MockPoolDataService } from '@/test/lib/mockPool';
import { ADDRESSES } from '@/test/lib/constants';
import { getPoolBalances } from './utils';

import pools_14717479 from '@/test/lib/pools_14717479.json';
import pools_15840286 from '@/test/lib/pools_15840286.json';

dotenv.config();

const poolWeighted = pools_14717479.find(
  (pool) =>
    pool.id ==
    '0xa6f548df93de924d73be7d25dc02554c6bd66db500020000000000000000000e' // B_50WBTC_50WETH
) as unknown as SubgraphPoolBase;

const poolComposableStable = pools_15840286.find(
  (pool) =>
    pool.id ==
    '0xa13a9247ea42d743238089903570127dda72fe4400000000000000000000035d' // bbausd
) as unknown as SubgraphPoolBase;

describe('exitModel', () => {
  let exitModel: ExitModel;
  let poolsDictionary: PoolDictionary;
  beforeEach(async () => {
    const relayerModel = new RelayerModel();
    exitModel = new ExitModel(relayerModel);
    const poolsRepository = new MockPoolDataService([
      cloneDeep(poolWeighted),
      cloneDeep(poolComposableStable),
    ]);
    const pools = new PoolsSource(
      poolsRepository,
      ADDRESSES[Network.MAINNET].WETH.address
    );
    poolsDictionary = await pools.poolsDictionary();
  });
  context('exitAction', async () => {
    it('weighted pool - exitExactBPTInForTokensOut', async () => {
      const poolId = poolWeighted.id;
      const exitPool = poolsDictionary[poolId];
      const bptIn = parseFixed('10', 18).toString();
      const userData = WeightedPoolEncoder.exitExactBPTInForTokensOut(bptIn);
      const exitPoolRequest: ExitPoolRequest = {
        actionType: ActionType.Exit,
        poolType: PoolType.Weighted,
        encodedUserData: userData,
        poolId,
        outputReferences: [],
      };
      const balancesBefore = getPoolBalances([
        {
          pool: exitPool,
          tokens: [...poolWeighted.tokensList, poolWeighted.address],
        },
      ]);

      const [tokens, amounts] = await exitModel.doExitPool(
        exitPoolRequest,
        poolsDictionary
      );

      const balancesAfter = getPoolBalances([
        {
          pool: exitPool,
          tokens: [...poolWeighted.tokensList, poolWeighted.address],
        },
      ]);
      expect(tokens).to.deep.eq([exitPool.address, ...poolWeighted.tokensList]);
      expect(amounts).to.deep.eq([
        '10000000000000000000',
        '-138218951',
        '-18666074549381720234',
      ]); // Taken from exit module
      expect(
        BigNumber.from(balancesBefore[0]).sub(balancesAfter[0]).toString()
      ).to.eq('138218951');
      expect(
        BigNumber.from(balancesBefore[1]).sub(balancesAfter[1]).toString()
      ).to.eq('18666074549381720234');
      expect(
        BigNumber.from(balancesBefore[2]).sub(balancesAfter[2]).toString()
      ).to.eq(bptIn);
    });
    it('ComposableStable - ExactBPTInForOneTokenOut', async () => {
      const poolId = poolComposableStable.id;
      const exitPool = poolsDictionary[poolId];
      const bptIn = parseFixed('10', 18).toString();
      const userData = ComposableStablePoolEncoder.exitExactBPTInForOneTokenOut(
        bptIn,
        0 // bbausdt
      );
      const exitPoolRequest: ExitPoolRequest = {
        actionType: ActionType.Exit,
        poolType: PoolType.ComposableStable,
        encodedUserData: userData,
        poolId,
        outputReferences: [],
      };
      const balancesBefore = getPoolBalances([
        { pool: exitPool, tokens: exitPool.tokensList },
      ]);

      const [tokens, amounts] = await exitModel.doExitPool(
        exitPoolRequest,
        poolsDictionary
      );
      expect(tokens).to.deep.eq([
        exitPool.address,
        ...exitPool.tokensList.filter(
          (t) => !isSameAddress(t, exitPool.address)
        ),
      ]);
      const balancesAfter = getPoolBalances([
        { pool: exitPool, tokens: exitPool.tokensList },
      ]);
      expect(
        BigNumber.from(balancesBefore[1]).sub(balancesAfter[1]).toString()
      ).to.eq('0');
      expect(
        BigNumber.from(balancesBefore[2]).sub(balancesAfter[2]).toString()
      ).to.eq(bptIn);
      expect(
        BigNumber.from(balancesBefore[3]).sub(balancesAfter[3]).toString()
      ).to.eq('0');
      expect(amounts).to.deep.eq([
        '10000000000000000000',
        '-9992541880923205377',
        '0',
        '0',
        '0',
      ]); // Taken from Tenderly simulation
      expect(
        BigNumber.from(balancesBefore[0]).sub(balancesAfter[0]).toString()
      ).to.eq('9992541880923205377'); // TODO - This result is innacurate when compared to Tenderly
    });
  });
});
