// yarn test:only ./src/modules/vaultModel/vaultModel.module.spec.ts
import dotenv from 'dotenv';
import { expect } from 'chai';
import { BigNumber, parseFixed } from '@ethersproject/bignumber';
import { Network, SubgraphPoolBase, SwapType } from '@/.';
import {
  VaultModel,
  JoinPool,
  ExitPool,
  BatchSwap,
  ActionType,
} from './vaultModel.module';

import { MockPoolDataService } from '@/test/lib/mockPool';
import { ADDRESSES } from '@/test/lib/constants';

import pools_14717479 from '@/test/lib/pools_14717479.json';
import pools_15840286 from '@/test/lib/pools_15840286.json';
import { PoolBase } from '@balancer-labs/sor';
import { cloneDeep } from 'lodash';
import { WeightedPoolEncoder } from '@/pool-weighted/encoder';
import { ComposableStablePoolEncoder } from '@/pool-composable-stable/encoder';

dotenv.config();

function getPoolBalances(pool: PoolBase, tokens: string[]): string[] {
  const balances: string[] = [];
  tokens.forEach((t) => {
    const tokenIndex = pool.tokens.findIndex(
      (pt) => pt.address.toLowerCase() === t.toLowerCase()
    );
    if (tokenIndex < 0) throw 'Pool does not contain tokenIn';
    balances.push(
      parseFixed(
        pool.tokens[tokenIndex].balance,
        pool.tokens[tokenIndex].decimals
      ).toString()
    );
  });
  return balances;
}

function getPoolBalancesOld(pool: PoolBase, tokens: string[]): string[] {
  const balances: string[] = [];
  let i = 0;
  while (i < tokens.length) {
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

describe('vault model', () => {
  context('instantiation', () => {
    it('instantiate via module', async () => {
      const poolsRepository = new MockPoolDataService([
        cloneDeep(poolWeighted),
      ]);
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
      const poolsRepository = new MockPoolDataService([
        cloneDeep(poolWeighted),
      ]);
      const vaultModel = new VaultModel(poolsRepository);
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
        poolWeighted.address,
      ]);

      const bptOut = await vaultModel.handleJoinPool(joinPoolRequest);

      const balancesAfter = getPoolBalances(joinPool, [
        ...tokensIn,
        poolWeighted.address,
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
  context('exitAction', async () => {
    it('weighted pool - exitExactBPTInForTokensOut', async () => {
      const poolsRepository = new MockPoolDataService([
        cloneDeep(poolWeighted),
      ]);
      const vaultModel = new VaultModel(poolsRepository);
      const poolId = poolWeighted.id;
      // Should be EVM scale
      const bptIn = parseFixed('10', 18).toString();
      const userData = WeightedPoolEncoder.exitExactBPTInForTokensOut(bptIn);
      const exitPoolRequest: ExitPool = {
        actionType: ActionType.Exit,
        poolType: 'Weighted',
        userData,
        poolId,
      };
      const poolsDictionary = await vaultModel.poolsDictionary();
      const joinPool = poolsDictionary[poolId];
      const balancesBefore = getPoolBalances(joinPool, [
        ...poolWeighted.tokensList,
        poolWeighted.address,
      ]);

      const amountsOut = await vaultModel.handleExitPool(exitPoolRequest);

      const balancesAfter = getPoolBalances(joinPool, [
        ...poolWeighted.tokensList,
        poolWeighted.address,
      ]);
      expect(amountsOut).to.deep.eq(['138218951', '18666074549381720234']); // Taken from exit module
      expect(
        BigNumber.from(balancesBefore[0]).sub(balancesAfter[0]).toString()
      ).to.eq(amountsOut[0]);
      expect(
        BigNumber.from(balancesBefore[1]).sub(balancesAfter[1]).toString()
      ).to.eq(amountsOut[1]);
      expect(
        BigNumber.from(balancesBefore[2]).sub(balancesAfter[2]).toString()
      ).to.eq(bptIn);
    });
    it('ComposableStable - ExactBPTInForOneTokenOut', async () => {
      const poolsRepository = new MockPoolDataService([
        cloneDeep(poolComposableStable),
      ]);
      const vaultModel = new VaultModel(poolsRepository);
      const poolId = poolComposableStable.id;
      // Should be EVM scale
      const bptIn = parseFixed('10', 18).toString();
      const userData = ComposableStablePoolEncoder.exitExactBPTInForOneTokenOut(
        bptIn,
        0
      );
      const exitPoolRequest: ExitPool = {
        actionType: ActionType.Exit,
        poolType: 'ComposableStable',
        userData,
        poolId,
      };
      const poolsDictionary = await vaultModel.poolsDictionary();
      const joinPool = poolsDictionary[poolId];
      const balancesBefore = getPoolBalances(
        joinPool,
        poolComposableStable.tokensList
      );

      const amountsOut = await vaultModel.handleExitPool(exitPoolRequest);
      const balanceTest = joinPool.parsePoolPairData(
        poolComposableStable.tokensList[0],
        poolComposableStable.tokensList[1]
      );

      const balancesAfter = getPoolBalances(
        joinPool,
        poolComposableStable.tokensList
      );
      console.log(poolComposableStable.tokensList);
      console.log(amountsOut.toString(), 'amountsOut');
      console.log(balancesBefore.toString(), 'before');
      console.log(balancesAfter.toString(), 'after');
      console.log(balanceTest.balanceIn.toString(), 'test');
      console.log(poolComposableStable.tokensList[0], 'TOKEN OUT TEST');
      console.log(
        BigNumber.from(balancesBefore[0]).sub(balancesAfter[0]).toString()
      );

      expect(
        BigNumber.from(balancesBefore[0]).sub(balancesAfter[0]).toString()
      ).to.eq(amountsOut[0]);
      expect(
        BigNumber.from(balancesBefore[1]).sub(balancesAfter[1]).toString()
      ).to.eq(amountsOut[1]);
      expect(
        BigNumber.from(balancesAfter[2]).sub(balancesBefore[2]).toString()
      ).to.eq(bptIn);
      expect(
        BigNumber.from(balancesBefore[3]).sub(balancesAfter[3]).toString()
      ).to.eq(amountsOut[3]);
      expect(amountsOut).to.deep.eq(['9992541880923205377', '0', '0', '0']); // Taken from Tenderly simulation
    });
  });
  context('batchSwapAction', async () => {
    context('ExactIn', () => {
      it('single swap', async () => {
        const poolsRepository = new MockPoolDataService(
          cloneDeep(pools_14717479 as unknown as SubgraphPoolBase[])
        );
        const vaultModel = new VaultModel(poolsRepository);
        const swapType = SwapType.SwapExactIn;
        const swap = [
          {
            poolId:
              '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014',
            assetInIndex: 0,
            assetOutIndex: 1,
            amount: '100000000000000000000',
            userData: '0x',
          },
        ];
        const assets = [
          '0xba100000625a3754423978a60c9317c58a424e3d',
          '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
        ];

        const funds = {
          sender: '',
          recipient: '',
          fromInternalBalance: false,
          toInternalBalance: false,
        };
        const batchSwapRequest: BatchSwap = {
          actionType: ActionType.BatchSwap,
          swapType,
          swaps: swap,
          assets,
          funds,
        };
        const poolsDictionary = await vaultModel.poolsDictionary();
        const swapPool = poolsDictionary[swap[0].poolId];
        const balancesBefore = getPoolBalances(swapPool, assets);

        const deltas = await vaultModel.handleBatchSwap(batchSwapRequest);

        const balancesAfter = getPoolBalances(swapPool, assets);
        expect(deltas).to.deep.eq([
          '100000000000000000000',
          '-488191063271093915',
        ]); // Taken from Tenderly simulation
        expect(
          BigNumber.from(balancesAfter[0]).sub(balancesBefore[0]).toString()
        ).to.eq(deltas[0]);
        expect(
          BigNumber.from(balancesAfter[1]).sub(balancesBefore[1]).toString()
        ).to.eq(deltas[1]);
      });
    });
    context('ExactOut', () => {
      it('single swap', async () => {
        const poolsRepository = new MockPoolDataService(
          cloneDeep(pools_14717479 as unknown as SubgraphPoolBase[])
        );
        const vaultModel = new VaultModel(poolsRepository);
        const swapType = SwapType.SwapExactOut;
        const swap = [
          {
            poolId:
              '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014',
            assetInIndex: 0,
            assetOutIndex: 1,
            amount: '100000000000000000000',
            userData: '0x',
          },
        ];
        const assets = [
          '0xba100000625a3754423978a60c9317c58a424e3d',
          '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
        ];

        const funds = {
          sender: '',
          recipient: '',
          fromInternalBalance: false,
          toInternalBalance: false,
        };
        const batchSwapRequest: BatchSwap = {
          actionType: ActionType.BatchSwap,
          swapType,
          swaps: swap,
          assets,
          funds,
        };
        const poolsDictionary = await vaultModel.poolsDictionary();
        const swapPool = poolsDictionary[swap[0].poolId];
        const balancesBefore = getPoolBalances(swapPool, assets);

        const deltas = await vaultModel.handleBatchSwap(batchSwapRequest);

        const balancesAfter = getPoolBalances(swapPool, assets);
        expect(deltas).to.deep.eq([
          '20635111802024409758812',
          '-100000000000000000000',
        ]); // Taken from Tenderly simulation
        expect(
          BigNumber.from(balancesAfter[0]).sub(balancesBefore[0]).toString()
        ).to.eq(deltas[0]);
        expect(
          BigNumber.from(balancesAfter[1]).sub(balancesBefore[1]).toString()
        ).to.eq(deltas[1]);
      });
    });
  });
});
