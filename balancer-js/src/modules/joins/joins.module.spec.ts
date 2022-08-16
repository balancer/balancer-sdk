import { expect } from 'chai';
import { factories } from '@/test/factories';
import { StaticPoolRepository } from '../data';
import { Pool } from '@/types';
import { Join } from './joins.module';
import { SubgraphPoolBase } from '@balancer-labs/sor';

describe('Generalised Joins', () => {
  context('boostedPool', () => {
    let joinModule: Join;
    let boostedPool: SubgraphPoolBase;
    before(() => {
      const linearDAI = factories.subgraphPoolBase.build({
        id: '0x804cdb9116a10bb78768d3252355a1b18067bf8f0000000000000000000000fb',
        address: '0x804cdb9116a10bb78768d3252355a1b18067bf8f',
        poolType: 'AaveLinear',
        tokens: [
          factories.subgraphToken
            .transient({ symbol: 'DAI', balance: '1000000000000000000000000' })
            .build(),
          factories.subgraphToken
            .transient({ symbol: 'aDAI', balance: '9711834000000000000000000' })
            .build(),
        ],
        wrappedIndex: 1,
        mainIndex: 0,
      });
      const linearUSDC = factories.subgraphPoolBase.build({
        id: '0x9210f1204b5a24742eba12f710636d76240df3d00000000000000000000000fc',
        address: '0x9210f1204b5a24742eba12f710636d76240df3d0',
        poolType: 'AaveLinear',
        tokens: [
          factories.subgraphToken
            .transient({ symbol: 'USDC', balance: '6833431000000000000000000' })
            .build(),
          factories.subgraphToken
            .transient({
              symbol: 'aUSDC',
              balance: '1000000000000000000000000',
            })
            .build(),
        ],
        wrappedIndex: 1,
        mainIndex: 0,
      });
      const linearUSDT = factories.subgraphPoolBase.build({
        id: '0x2bbf681cc4eb09218bee85ea2a5d3d13fa40fc0c0000000000000000000000fd',
        address: '0x2bbf681cc4eb09218bee85ea2a5d3d13fa40fc0c',
        poolType: 'AaveLinear',
        tokens: [
          factories.subgraphToken
            .transient({ symbol: 'USDT', balance: '2901146000000000000000000' })
            .build(),
          factories.subgraphToken
            .transient({
              symbol: 'aUSDT',
              balance: '38559678000000000000000000',
            })
            .build(),
        ],
        wrappedIndex: 1,
        mainIndex: 0,
      });

      boostedPool = factories.subgraphPoolBase.build({
        id: '0x7b50775383d3d6f0215a8f290f2c9e2eebbeceb20000000000000000000000fe',
        address: '0x7b50775383d3d6f0215a8f290f2c9e2eebbeceb2',
        poolType: 'StablePhantom',
        totalWeight: undefined,
        tokens: [
          factories.subgraphToken
            .transient({
              symbol: 'bDAI',
              weight: '0',
              balance: '45574579899159999545777970',
            })
            .build(),
          factories.subgraphToken
            .transient({
              symbol: 'bUSDC',
              weight: '0',
              balance: '44945999398834558692289219',
            })
            .build(),
          factories.subgraphToken
            .transient({
              symbol: 'bUSDT',
              weight: '0',
              balance: '32432289817842790298866620',
            })
            .build(),
        ],
      });

      const pools = [linearDAI, linearUSDC, linearUSDT, boostedPool];
      // Create staticPools provider with above pools
      const poolProvider = new StaticPoolRepository(pools as Pool[]);
      joinModule = new Join(poolProvider, 1);
    });

    it('should throw when pool doesnt exist', async () => {
      let errorMessage = '';
      try {
        await joinModule.joinPool('thisisntapool', '0', [], []);
      } catch (error) {
        errorMessage = (error as Error).message;
      }
      expect(errorMessage).to.eq('balancer pool does not exist');
    });

    it('testing', async () => {
      const inputTokens = [
        '0x6b175474e89094c44da98b954eedeac495271d0f',
        '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        '0xdac17f958d2ee523a2206206994597c13d831ec7',
      ];
      const inputAmounts = ['1000000000000000000', '1000000', '1000000'];
      const root = await joinModule.joinPool(
        boostedPool.id,
        '7777777',
        inputTokens,
        inputAmounts
      );
      // TO DO - Add tests for correct call/action construction?
      // Ideally integration tests will cover actual call data success
    });
  });
});
