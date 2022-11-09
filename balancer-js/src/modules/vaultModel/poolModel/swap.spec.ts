// yarn test:only ./src/modules/vaultModel/poolModel/swap.spec.ts
import dotenv from 'dotenv';
import { expect } from 'chai';
import { cloneDeep } from 'lodash';
import { BigNumber } from '@ethersproject/bignumber';

import { PoolDictionary } from '../poolSource';
import { Network, SubgraphPoolBase, SwapType } from '@/.';
import { ActionType } from '../vaultModel.module';
import { BatchSwapRequest, SwapModel } from './swap';
import { RelayerModel } from '../relayer';
import { PoolsSource } from '../poolSource';

import { MockPoolDataService } from '@/test/lib/mockPool';
import { ADDRESSES } from '@/test/lib/constants';
import { getPoolBalances } from './utils';

import pools_14717479 from '@/test/lib/pools_14717479.json';

dotenv.config();

describe('swapModel', () => {
  let swapModel: SwapModel;
  let poolsDictionary: PoolDictionary;
  beforeEach(async () => {
    const relayerModel = new RelayerModel();
    swapModel = new SwapModel(relayerModel);
    const poolsRepository = new MockPoolDataService(
      cloneDeep(pools_14717479 as unknown as SubgraphPoolBase[])
    );
    const pools = new PoolsSource(
      poolsRepository,
      ADDRESSES[Network.MAINNET].WETH.address
    );
    poolsDictionary = await pools.poolsDictionary();
  });

  context('batchSwapAction', async () => {
    context('ExactIn', () => {
      it('single hop', async () => {
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
        const swapPool = poolsDictionary[swap[0].poolId];
        const balancesBefore = getPoolBalances([
          { pool: swapPool, tokens: assets },
        ]);

        const deltas = await swapModel.doBatchSwap(
          batchSwapRequest,
          poolsDictionary
        );

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
        const swapPool1 = poolsDictionary[swaps[0].poolId];
        const swapPool2 = poolsDictionary[swaps[1].poolId];
        const balancesBefore = getPoolBalances([
          { pool: swapPool1, tokens: [assets[0], assets[1]] },
          { pool: swapPool2, tokens: [assets[1], assets[2]] },
        ]);

        const deltas = await swapModel.doBatchSwap(
          batchSwapRequest,
          poolsDictionary
        );

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
        const swapPool = poolsDictionary[swap[0].poolId];
        const balancesBefore = getPoolBalances([
          { pool: swapPool, tokens: assets },
        ]);

        const deltas = await swapModel.doBatchSwap(
          batchSwapRequest,
          poolsDictionary
        );
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
        const swapPool1 = poolsDictionary[swaps[0].poolId];
        const swapPool2 = poolsDictionary[swaps[1].poolId];
        const balancesBefore = getPoolBalances([
          { pool: swapPool2, tokens: [assets[0], assets[1]] },
          { pool: swapPool1, tokens: [assets[1], assets[2]] },
        ]);

        const deltas = await swapModel.doBatchSwap(
          batchSwapRequest,
          poolsDictionary
        );

        const balancesAfter = getPoolBalances([
          { pool: swapPool2, tokens: [assets[0], assets[1]] },
          { pool: swapPool1, tokens: [assets[1], assets[2]] },
        ]);
        expect(deltas).to.deep.eq(['70123692802964272311', '0', '-1000000000']); // Taken from Tenderly simulation
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
