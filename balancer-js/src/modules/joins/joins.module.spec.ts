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
      // The boostedPool will contain these Linear pools.
      const linearPools = [
        {
          tokens: {
            wrappedSymbol: 'aDAI',
            mainSymbol: 'DAI',
          },
          balance: '1000000',
          parentProportion: '0.5',
        },
        {
          tokens: {
            wrappedSymbol: 'aUSDC',
            mainSymbol: 'USDC',
          },
          balance: '500000',
          parentProportion: '0.25',
        },
        {
          tokens: {
            wrappedSymbol: 'aUSDT',
            mainSymbol: 'USDT',
          },
          balance: '500000',
          parentProportion: '0.25',
        },
      ];
      const boostedPoolInfo = factories.boostedPool
        .transient({
          linearPoolsParams: {
            pools: linearPools,
          },
          id: 'phantom_boosted_1',
          address: 'address_phantom_boosted_1',
        })
        .build();
      boostedPool = boostedPoolInfo.boostedPool;
      const pools = [...boostedPoolInfo.linearPools, boostedPool];
      // // Create staticPools provider with above pools
      const poolProvider = new StaticPoolRepository(pools as Pool[]);
      joinModule = new Join(poolProvider);
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

  context('boostedMetaPool', () => {
    let joinModule: Join;
    let boostedPool: SubgraphPoolBase;
    before(() => {
      // The boostedMeta will have:
      // - boosted with linearPools[0], linearPools[1], linearPools[2]
      // - a single linearPool, linearPools[3]
      // Note proportions are referenced to parent nodes
      const linearPools = [
        {
          tokens: {
            wrappedSymbol: 'aDAI',
            mainSymbol: 'DAI',
          },
          balance: '1000000',
          parentProportion: '0.25',
        },
        {
          tokens: {
            wrappedSymbol: 'aUSDC',
            mainSymbol: 'USDC',
          },
          balance: '500000',
          parentProportion: '0.125',
        },
        {
          tokens: {
            wrappedSymbol: 'aUSDT',
            mainSymbol: 'USDT',
          },
          balance: '500000',
          parentProportion: '0.125',
        },
        {
          tokens: {
            wrappedSymbol: 'aSTABLE',
            mainSymbol: 'STABLE',
          },
          balance: '500000',
          parentProportion: '0.5',
        },
      ];
      const boostedPoolInfo = factories.boostedMetaPool
        .transient({
          linearPoolsParams: {
            pools: linearPools,
          },
          id: 'phantom_boosted_1',
          address: 'address_phantom_boosted_1',
        })
        .build();
      boostedPool = boostedPoolInfo.boostedPool;
      const pools = [
        ...boostedPoolInfo.linearPools,
        boostedPoolInfo.childBoostedPool.pool,
        boostedPool,
      ];
      // // Create staticPools provider with above pools
      const poolProvider = new StaticPoolRepository(pools as Pool[]);
      joinModule = new Join(poolProvider);
    });

    it('testing', async () => {
      const inputTokens = [
        '0x6b175474e89094c44da98b954eedeac495271d0f',
        '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        '0xdac17f958d2ee523a2206206994597c13d831ec7',
        'address_STABLE',
      ];
      const inputAmounts = [
        '1000000000000000000',
        '1000000',
        '1000000',
        '1000000000000000000',
      ];
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
