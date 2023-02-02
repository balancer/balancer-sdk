// yarn test:only ./src/modules/vaultModel/vaultModel.module.spec.ts
import dotenv from 'dotenv';
import { expect } from 'chai';
import { cloneDeep } from 'lodash';
import { parseFixed } from '@ethersproject/bignumber';

import { Network, SubgraphPoolBase, SwapType } from '@/.';
import { WeightedPoolEncoder } from '@/pool-weighted/encoder';
import { VaultModel, ActionType } from './vaultModel.module';
import { ExitPoolRequest } from './poolModel/exit';
import { BatchSwapRequest } from './poolModel/swap';

import { MockPoolDataService } from '@/test/lib/mockPool';
import { ADDRESSES } from '@/test/lib/constants';

import pools_14717479 from '@/test/lib/pools_14717479.json';

dotenv.config();

const poolWeighted = pools_14717479.find(
  (pool) =>
    pool.id ==
    '0xa6f548df93de924d73be7d25dc02554c6bd66db500020000000000000000000e' // B_50WBTC_50WETH
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
      const pools = await vaultModel.poolsSource.all();
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
