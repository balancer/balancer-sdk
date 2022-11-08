// yarn test:only ./src/modules/vaultModel/vaultModel.module.spec.ts
import dotenv from 'dotenv';
import { expect } from 'chai';
import { BigNumber, parseFixed } from '@ethersproject/bignumber';
import { Network, SubgraphPoolBase, SwapType } from '@/.';
import {
  VaultModel,
  JoinPoolRequest,
  ExitPoolRequest,
  BatchSwapRequest,
  ActionType,
} from './vaultModel.module';
import { PoolType } from '@/types';
import { isSameAddress } from '@/lib/utils';

import { MockPoolDataService } from '@/test/lib/mockPool';
import { ADDRESSES } from '@/test/lib/constants';

import pools_14717479 from '@/test/lib/pools_14717479.json';
import pools_15840286 from '@/test/lib/pools_15840286.json';
import { PoolBase } from '@balancer-labs/sor';
import { cloneDeep } from 'lodash';
import { WeightedPoolEncoder } from '@/pool-weighted/encoder';
import { ComposableStablePoolEncoder } from '@/pool-composable-stable/encoder';

dotenv.config();

type PoolBalanceInput = { pool: PoolBase; tokens: string[] };

function getPoolBalances(poolBalancesInput: PoolBalanceInput[]): string[] {
  const balances: string[] = [];
  poolBalancesInput.forEach((ip) => {
    ip.tokens.forEach((t) => {
      const tokenIndex = ip.pool.tokens.findIndex(
        (pt) => pt.address.toLowerCase() === t.toLowerCase()
      );
      if (tokenIndex < 0) throw 'Pool does not contain tokenIn';
      balances.push(
        parseFixed(
          ip.pool.tokens[tokenIndex].balance,
          ip.pool.tokens[tokenIndex].decimals
        ).toString()
      );
    });
  });
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
      const vaultModel = new VaultModel(
        poolsRepository,
        ADDRESSES[Network.MAINNET].WETH.address
      );
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
  context('independent actions', async () => {
    context('joinAction', async () => {
      it('weighted pool - joinExactTokensInForBPTOut', async () => {
        const poolsRepository = new MockPoolDataService([
          cloneDeep(poolWeighted),
        ]);
        const vaultModel = new VaultModel(
          poolsRepository,
          ADDRESSES[Network.MAINNET].WETH.address
        );
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
        const poolsDictionary = await vaultModel.poolsDictionary();
        const joinPool = poolsDictionary[poolId];
        const balancesBefore = getPoolBalances([
          {
            pool: joinPool,
            tokens: [...tokensIn, poolWeighted.address],
          },
        ]);

        const [tokens, amounts] = await vaultModel.doJoinPool(joinPoolRequest);

        const balancesAfter = getPoolBalances([
          { pool: joinPool, tokens: [...tokensIn, poolWeighted.address] },
        ]);
        expect(tokens).to.deep.eq([...tokensIn, joinPool.address]);
        expect(amounts).to.deep.eq([
          '123000000',
          '10700000000000000000',
          '-7314757264527952668',
        ]);
        expect(
          BigNumber.from(balancesAfter[0]).sub(balancesBefore[0]).toString()
        ).to.eq(amountsIn[0]);
        expect(
          BigNumber.from(balancesAfter[1]).sub(balancesBefore[1]).toString()
        ).to.eq(amountsIn[1]);
        expect(
          BigNumber.from(balancesAfter[2]).sub(balancesBefore[2]).toString()
        ).to.eq('7314757264527952668');
      });
      it('ComposableStable - joinExactTokensInForBPTOut', async () => {
        const poolsRepository = new MockPoolDataService([
          cloneDeep(poolComposableStable),
        ]);
        const vaultModel = new VaultModel(
          poolsRepository,
          ADDRESSES[Network.MAINNET].WETH.address
        );
        const poolId = poolComposableStable.id;
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
          ComposableStablePoolEncoder.joinExactTokensInForBPTOut(
            amountsIn,
            '0'
          );

        const joinPoolRequest: JoinPoolRequest = {
          actionType: ActionType.Join,
          poolId,
          encodedUserData,
          outputReference: '',
        };
        const poolsDictionary = await vaultModel.poolsDictionary();
        const joinPool = poolsDictionary[poolId];
        const balancesBefore = getPoolBalances([
          {
            pool: joinPool,
            tokens: tokensIn,
          },
        ]);

        const [tokens, amounts] = await vaultModel.doJoinPool(joinPoolRequest);

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
        expect(amounts).to.deep.eq([
          '1230000000000000000',
          '10700000000000000000',
          '1099543200000000000000',
          '-1111327432434158659003', // TODO - This result is innacurate when compared to Tenderly
        ]); // From Tenderly
      });
    });
    context('exitAction', async () => {
      it('weighted pool - exitExactBPTInForTokensOut', async () => {
        const poolsRepository = new MockPoolDataService([
          cloneDeep(poolWeighted),
        ]);
        const vaultModel = new VaultModel(
          poolsRepository,
          ADDRESSES[Network.MAINNET].WETH.address
        );
        const poolId = poolWeighted.id;
        // Should be EVM scale
        const bptIn = parseFixed('10', 18).toString();
        const userData = WeightedPoolEncoder.exitExactBPTInForTokensOut(bptIn);
        const exitPoolRequest: ExitPoolRequest = {
          actionType: ActionType.Exit,
          poolType: PoolType.Weighted,
          encodedUserData: userData,
          poolId,
          outputReferences: [],
        };
        const poolsDictionary = await vaultModel.poolsDictionary();
        const exitPool = poolsDictionary[poolId];
        const balancesBefore = getPoolBalances([
          {
            pool: exitPool,
            tokens: [...poolWeighted.tokensList, poolWeighted.address],
          },
        ]);

        const [tokens, amounts] = await vaultModel.doExitPool(exitPoolRequest);

        const balancesAfter = getPoolBalances([
          {
            pool: exitPool,
            tokens: [...poolWeighted.tokensList, poolWeighted.address],
          },
        ]);
        expect(tokens).to.deep.eq([
          exitPool.address,
          ...poolWeighted.tokensList,
        ]);
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
        const poolsRepository = new MockPoolDataService([
          cloneDeep(poolComposableStable),
        ]);
        const vaultModel = new VaultModel(
          poolsRepository,
          ADDRESSES[Network.MAINNET].WETH.address
        );
        const poolId = poolComposableStable.id;
        // Should be EVM scale
        const bptIn = parseFixed('10', 18).toString();
        // bbausdt
        const userData =
          ComposableStablePoolEncoder.exitExactBPTInForOneTokenOut(bptIn, 0);
        const exitPoolRequest: ExitPoolRequest = {
          actionType: ActionType.Exit,
          poolType: PoolType.ComposableStable,
          encodedUserData: userData,
          poolId,
          outputReferences: [],
        };
        const poolsDictionary = await vaultModel.poolsDictionary();
        const exitPool = poolsDictionary[poolId];
        const balancesBefore = getPoolBalances([
          { pool: exitPool, tokens: exitPool.tokensList },
        ]);

        const [tokens, amounts] = await vaultModel.doExitPool(exitPoolRequest);
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
    context('batchSwapAction', async () => {
      context('ExactIn', () => {
        it('single hop', async () => {
          const poolsRepository = new MockPoolDataService(
            cloneDeep(pools_14717479 as unknown as SubgraphPoolBase[])
          );
          const vaultModel = new VaultModel(
            poolsRepository,
            ADDRESSES[Network.MAINNET].WETH.address
          );
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
          const batchSwapRequest: BatchSwapRequest = {
            actionType: ActionType.BatchSwap,
            swapType,
            swaps: swap,
            assets,
            funds,
            outputReferences: [],
          };
          const poolsDictionary = await vaultModel.poolsDictionary();
          const swapPool = poolsDictionary[swap[0].poolId];
          const balancesBefore = getPoolBalances([
            { pool: swapPool, tokens: assets },
          ]);

          const deltas = await vaultModel.doBatchSwap(batchSwapRequest);

          const balancesAfter = getPoolBalances([
            { pool: swapPool, tokens: assets },
          ]);
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
        it('multihop', async () => {
          const poolsRepository = new MockPoolDataService(
            cloneDeep(pools_14717479 as unknown as SubgraphPoolBase[])
          );
          const vaultModel = new VaultModel(
            poolsRepository,
            ADDRESSES[Network.MAINNET].WETH.address
          );
          const swapType = SwapType.SwapExactIn;
          const swaps = [
            {
              poolId:
                '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014',
              assetInIndex: 0,
              assetOutIndex: 1,
              amount: '100000000000000000000',
              userData: '0x',
            },
            {
              poolId:
                '0x96646936b91d6b9d7d0c47c496afbf3d6ec7b6f8000200000000000000000019',
              assetInIndex: 1,
              assetOutIndex: 2,
              amount: '0',
              userData: '0x',
            },
          ];
          const assets = [
            '0xba100000625a3754423978a60c9317c58a424e3d',
            '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
            '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          ];

          const funds = {
            sender: '',
            recipient: '',
            fromInternalBalance: false,
            toInternalBalance: false,
          };
          const batchSwapRequest: BatchSwapRequest = {
            actionType: ActionType.BatchSwap,
            swapType,
            swaps,
            assets,
            funds,
            outputReferences: [],
          };
          const poolsDictionary = await vaultModel.poolsDictionary();
          const swapPool1 = poolsDictionary[swaps[0].poolId];
          const swapPool2 = poolsDictionary[swaps[1].poolId];
          const balancesBefore = getPoolBalances([
            { pool: swapPool1, tokens: [assets[0], assets[1]] },
            { pool: swapPool2, tokens: [assets[1], assets[2]] },
          ]);

          const deltas = await vaultModel.doBatchSwap(batchSwapRequest);

          const balancesAfter = getPoolBalances([
            { pool: swapPool1, tokens: [assets[0], assets[1]] },
            { pool: swapPool2, tokens: [assets[1], assets[2]] },
          ]);
          expect(deltas).to.deep.eq([
            '100000000000000000000',
            '0',
            '-1426027854',
          ]); // Taken from Tenderly simulation
          expect(
            BigNumber.from(balancesAfter[0]).sub(balancesBefore[0]).toString()
          ).to.eq(deltas[0]);
          const hopTokenDeltaPool1 = BigNumber.from(balancesAfter[1]).sub(
            balancesBefore[1]
          );
          const hopTokenDeltaPool2 = BigNumber.from(balancesAfter[2]).sub(
            balancesBefore[2]
          );
          expect(hopTokenDeltaPool1.add(hopTokenDeltaPool2).toString()).to.eq(
            '0'
          );
          expect(
            BigNumber.from(balancesAfter[3]).sub(balancesBefore[3]).toString()
          ).to.eq(deltas[2]);
        });
      });
      context('ExactOut', () => {
        it('single hop', async () => {
          const poolsRepository = new MockPoolDataService(
            cloneDeep(pools_14717479 as unknown as SubgraphPoolBase[])
          );
          const vaultModel = new VaultModel(
            poolsRepository,
            ADDRESSES[Network.MAINNET].WETH.address
          );
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
          const batchSwapRequest: BatchSwapRequest = {
            actionType: ActionType.BatchSwap,
            swapType,
            swaps: swap,
            assets,
            funds,
            outputReferences: [],
          };
          const poolsDictionary = await vaultModel.poolsDictionary();
          const swapPool = poolsDictionary[swap[0].poolId];
          const balancesBefore = getPoolBalances([
            { pool: swapPool, tokens: assets },
          ]);

          const deltas = await vaultModel.doBatchSwap(batchSwapRequest);
          const balancesAfter = getPoolBalances([
            { pool: swapPool, tokens: assets },
          ]);
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
        it('multihop', async () => {
          const poolsRepository = new MockPoolDataService(
            cloneDeep(pools_14717479 as unknown as SubgraphPoolBase[])
          );
          const vaultModel = new VaultModel(
            poolsRepository,
            ADDRESSES[Network.MAINNET].WETH.address
          );
          const swapType = SwapType.SwapExactOut;
          const swaps = [
            {
              poolId:
                '0x96646936b91d6b9d7d0c47c496afbf3d6ec7b6f8000200000000000000000019',
              assetInIndex: 1,
              assetOutIndex: 2,
              amount: '1000000000',
              userData: '0x',
            },
            {
              poolId:
                '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014',
              assetInIndex: 0,
              assetOutIndex: 1,
              amount: '0',
              userData: '0x',
            },
          ];
          const assets = [
            '0xba100000625a3754423978a60c9317c58a424e3d',
            '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
            '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          ];

          const funds = {
            sender: '',
            recipient: '',
            fromInternalBalance: false,
            toInternalBalance: false,
          };
          const batchSwapRequest: BatchSwapRequest = {
            actionType: ActionType.BatchSwap,
            swapType,
            swaps,
            assets,
            funds,
            outputReferences: [],
          };
          const poolsDictionary = await vaultModel.poolsDictionary();
          const swapPool1 = poolsDictionary[swaps[0].poolId];
          const swapPool2 = poolsDictionary[swaps[1].poolId];
          const balancesBefore = getPoolBalances([
            { pool: swapPool2, tokens: [assets[0], assets[1]] },
            { pool: swapPool1, tokens: [assets[1], assets[2]] },
          ]);

          const deltas = await vaultModel.doBatchSwap(batchSwapRequest);

          const balancesAfter = getPoolBalances([
            { pool: swapPool2, tokens: [assets[0], assets[1]] },
            { pool: swapPool1, tokens: [assets[1], assets[2]] },
          ]);
          expect(deltas).to.deep.eq([
            '70123692802964272311',
            '0',
            '-1000000000',
          ]); // Taken from Tenderly simulation
          expect(
            BigNumber.from(balancesAfter[0]).sub(balancesBefore[0]).toString()
          ).to.eq(deltas[0]);
          const hopTokenDeltaPool1 = BigNumber.from(balancesAfter[1]).sub(
            balancesBefore[1]
          );
          const hopTokenDeltaPool2 = BigNumber.from(balancesAfter[2]).sub(
            balancesBefore[2]
          );
          expect(hopTokenDeltaPool1.add(hopTokenDeltaPool2).toString()).to.eq(
            '0'
          );
          expect(
            BigNumber.from(balancesAfter[3]).sub(balancesBefore[3]).toString()
          ).to.eq(deltas[2]);
        });
      });
    });
  });
  context('multicall', async () => {
    context('no outputreferences', async () => {
      it('should exectute actions independently', async () => {
        const poolsRepository = new MockPoolDataService(
          cloneDeep(pools_14717479 as unknown as SubgraphPoolBase[])
        );
        const vaultModel = new VaultModel(
          poolsRepository,
          ADDRESSES[Network.MAINNET].WETH.address
        );
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
        const batchSwapRequest: BatchSwapRequest = {
          actionType: ActionType.BatchSwap,
          swapType,
          swaps: swap,
          assets,
          funds,
          outputReferences: [],
        };

        const poolId = poolWeighted.id;
        const bptIn = parseFixed('10', 18).toString();
        const userData = WeightedPoolEncoder.exitExactBPTInForTokensOut(bptIn);
        const exitPoolRequest: ExitPoolRequest = {
          actionType: ActionType.Exit,
          poolType: PoolType.Weighted,
          encodedUserData: userData,
          poolId,
          outputReferences: [],
        };

        const deltas = await vaultModel.multicall([
          batchSwapRequest,
          exitPoolRequest,
        ]);
        expect(
          deltas['0xba100000625a3754423978a60c9317c58a424e3d'].toString()
        ).to.eq('100000000000000000000');
        expect(
          deltas['0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'].toString()
        ).to.eq('-19154265612652814149'); // This is total of weth out from both actions
        expect(
          deltas['0xa6f548df93de924d73be7d25dc02554c6bd66db5'].toString()
        ).to.eq('10000000000000000000');
        expect(
          deltas['0x2260fac5e5542a773aa44fbcfedf7c193bc2c599'].toString()
        ).to.eq('-138218951');
      });
    });
  });
});
