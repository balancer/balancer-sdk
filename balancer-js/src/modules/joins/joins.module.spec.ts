import { expect } from 'chai';
import { factories } from '@/test/factories';
import {
  BoostedParams,
  LinearParams,
  BoostedMetaBigParams,
} from '@/test/factories/pools';
import { StaticPoolRepository } from '../data';
import { Pool } from '@/types';
import { Join } from './joins.module';
import { SubgraphPoolBase } from '@balancer-labs/sor';

describe('Generalised Joins', () => {
  context('Boosted', () => {
    let joinModule: Join;
    let rootPool: SubgraphPoolBase;
    beforeEach(() => {
      // The boostedPool will contain these Linear pools.
      const linearPools = [
        {
          tokens: {
            wrappedSymbol: 'aDAI',
            mainSymbol: 'DAI',
          },
          balance: '1000000',
        },
        {
          tokens: {
            wrappedSymbol: 'aUSDC',
            mainSymbol: 'USDC',
          },
          balance: '500000',
        },
        {
          tokens: {
            wrappedSymbol: 'aUSDT',
            mainSymbol: 'USDT',
          },
          balance: '500000',
        },
      ];
      const boostedInfo = factories.boostedPool
        .transient({
          linearPoolsParams: {
            pools: linearPools,
          },
          rootId: 'phantom_boosted_1',
          rootAddress: 'address_phantom_boosted_1',
        })
        .build();
      rootPool = boostedInfo.rootPool;
      const pools = [...boostedInfo.linearPools, rootPool];
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

    it('all leaf tokens', async () => {
      const inputTokens = [
        '0x6b175474e89094c44da98b954eedeac495271d0f',
        '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        '0xdac17f958d2ee523a2206206994597c13d831ec7',
      ];
      const inputAmounts = ['1000000000000000000', '1000000', '1000000'];
      const root = await joinModule.joinPool(
        rootPool.id,
        '7777777',
        inputTokens,
        inputAmounts
      );
    });

    it('single leaf token', async () => {
      const inputTokens = ['0x6b175474e89094c44da98b954eedeac495271d0f'];
      const inputAmounts = ['1000000000000000000'];
      const root = await joinModule.joinPool(
        rootPool.id,
        '7777777',
        inputTokens,
        inputAmounts
      );
    });

    // TO DO - Add tests for correct call/action construction?
    // Ideally integration tests will cover actual call data success
  });

  context('boostedMeta', () => {
    let joinModule: Join;
    let rootPool: SubgraphPoolBase;
    before(() => {
      // The boostedMeta will have:
      // - boosted with linearPools[0], linearPools[1], linearPools[2]
      // - a single linearPool, linearPools[3]
      // Note proportions are referenced to parent nodes
      const childBoostedParams: BoostedParams = {
        rootId: 'id-child',
        rootAddress: 'address-child',
        rootBalance: '500000',
        linearPoolsParams: {
          pools: [
            {
              tokens: {
                wrappedSymbol: 'aDAI',
                mainSymbol: 'DAI',
              },
              balance: '1000000',
            },
            {
              tokens: {
                wrappedSymbol: 'aUSDC',
                mainSymbol: 'USDC',
              },
              balance: '500000',
            },
            {
              tokens: {
                wrappedSymbol: 'aUSDT',
                mainSymbol: 'USDT',
              },
              balance: '500000',
            },
          ],
        },
      };
      const childLinearParam: LinearParams = {
        pools: [
          {
            tokens: {
              wrappedSymbol: 'aSTABLE',
              mainSymbol: 'STABLE',
            },
            balance: '500000',
          },
        ],
      };
      const boostedMetaInfo = factories.boostedMetaPool
        .transient({
          rootId: 'id-parent',
          rootAddress: 'address-parent',
          rootBalance: '1000000',
          childBoostedParams,
          childLinearParam,
        })
        .build();
      rootPool = boostedMetaInfo.rootInfo.pool;
      const pools = [
        ...boostedMetaInfo.childLinearInfo.linearPools,
        boostedMetaInfo.childBoostedInfo.rootPool,
        ...boostedMetaInfo.childBoostedInfo.linearPools,
        rootPool,
      ];
      // // Create staticPools provider with above pools
      const poolProvider = new StaticPoolRepository(pools as Pool[]);
      joinModule = new Join(poolProvider);
    });

    it('all leaf tokens', async () => {
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
        rootPool.id,
        '7777777',
        inputTokens,
        inputAmounts
      );
    });

    it('single linear token', async () => {
      const inputTokens = ['address_STABLE'];
      const inputAmounts = ['1000000000000000000'];
      const root = await joinModule.joinPool(
        rootPool.id,
        '7777777',
        inputTokens,
        inputAmounts
      );
    });

    it('single boosted leaf token', async () => {
      const inputTokens = ['0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'];
      const inputAmounts = ['1000000'];
      const root = await joinModule.joinPool(
        rootPool.id,
        '7777777',
        inputTokens,
        inputAmounts
      );
    });
  });

  // TO DO - Add boostedMetaBig with different leaf tokens

  context('boostedMetaBig, has same leaf tokens', () => {
    let joinModule: Join;
    let rootPool: SubgraphPoolBase;
    before(() => {
      // The boostedMetaBig will have a phantomStable with two boosted.
      // Note:
      // first pool will be parent
      // proportions are referenced to parent nodes
      const child1LinearPools: LinearParams = {
        pools: [
          {
            tokens: {
              wrappedSymbol: 'aDAI',
              mainSymbol: 'DAI',
            },
            balance: '1000000',
          },
          {
            tokens: {
              wrappedSymbol: 'aUSDC',
              mainSymbol: 'USDC',
            },
            balance: '500000',
          },
          {
            tokens: {
              wrappedSymbol: 'aUSDT',
              mainSymbol: 'USDT',
            },
            balance: '500000',
          },
        ],
      };
      const childBoosted1: BoostedParams = {
        linearPoolsParams: child1LinearPools,
        rootId: 'childBoosted1-id',
        rootAddress: 'childBoosted1-address',
        rootBalance: '1000000',
      };
      const child2LinearPools: LinearParams = {
        pools: [
          {
            tokens: {
              wrappedSymbol: 'cDAI',
              mainSymbol: 'DAI',
            },
            balance: '4000000',
          },
          {
            tokens: {
              wrappedSymbol: 'cUSDC',
              mainSymbol: 'USDC',
            },
            balance: '4000000',
          },
          {
            tokens: {
              wrappedSymbol: 'cUSDT',
              mainSymbol: 'USDT',
            },
            balance: '2000000',
          },
        ],
      };
      const childBoosted2: BoostedParams = {
        linearPoolsParams: child2LinearPools,
        rootId: 'childBoosted2-id',
        rootAddress: 'childBoosted2-address',
        rootBalance: '1000000',
      };
      const parentPool: BoostedMetaBigParams = {
        rootId: 'parentBoosted-id',
        rootAddress: 'parentBoosted-address',
        rootBalance: '7777777',
        childPools: [childBoosted1, childBoosted2],
      };

      const boostedMetaBigInfo = factories.boostedMetaBigPool
        .transient(parentPool)
        .build();
      rootPool = boostedMetaBigInfo.rootPool;
      const pools = [
        ...boostedMetaBigInfo.childPools,
        boostedMetaBigInfo.rootPool,
      ];
      // // Create staticPools provider with above pools
      const poolProvider = new StaticPoolRepository(pools as Pool[]);
      joinModule = new Join(poolProvider);
    });

    it('all leaf tokens', async () => {
      const inputTokens = [
        '0x6b175474e89094c44da98b954eedeac495271d0f',
        '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        '0xdac17f958d2ee523a2206206994597c13d831ec7',
      ];
      const inputAmounts = ['1000000000000000000', '1000000', '1000000'];
      const root = await joinModule.joinPool(
        rootPool.id,
        '7777777',
        inputTokens,
        inputAmounts
      );
    });

    it('single boosted leaf token', async () => {
      const inputTokens = ['0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'];
      const inputAmounts = ['1000000'];
      const root = await joinModule.joinPool(
        rootPool.id,
        '7777777',
        inputTokens,
        inputAmounts
      );
    });
  });
});
