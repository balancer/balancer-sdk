import { expect } from 'chai';
import { factories } from '@/test/factories';
import { StaticPoolRepository } from '../data';
import { Pool } from '@/types';
import { Join } from './joins.module';
import { SubgraphPoolBase } from '@balancer-labs/sor';
import { Network } from '@/lib/constants/network';
import { formatAddress } from '@/test/lib/utils';

describe('Generalised Joins', () => {
  context('boostedPool', () => {
    let joinModule: Join;
    let boostedPool: SubgraphPoolBase;
    let userAddress: string;
    before(() => {
      userAddress = formatAddress('testAccount');
      // The boostedPool will contain these Linear pools.
      const linearPools = [
        {
          wrappedSymbol: 'aDAI',
          mainSymbol: 'DAI',
          balance: '1000000',
          proportion: '0.5',
        },
        {
          wrappedSymbol: 'aUSDC',
          mainSymbol: 'USDC',
          balance: '500000',
          proportion: '0.25',
        },
        {
          wrappedSymbol: 'aUSDT',
          mainSymbol: 'USDT',
          balance: '500000',
          proportion: '0.25',
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
      joinModule = new Join(poolProvider, Network.MAINNET);
    });

    it('should throw when pool doesnt exist', async () => {
      let errorMessage = '';
      try {
        await joinModule.joinPool('thisisntapool', '0', [], [], userAddress);
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
      const { to, data } = await joinModule.joinPool(
        boostedPool.id,
        '7777777',
        inputTokens,
        inputAmounts,
        userAddress
      );
      // TO DO - Add tests for correct call/action construction?
      // Ideally integration tests will cover actual call data success
    });
  });

  context('boostedMetaPool', () => {
    let joinModule: Join;
    let boostedPool: SubgraphPoolBase;
    let userAddress: string;
    before(() => {
      userAddress = formatAddress('testAccount');

      // The boostedMeta will have:
      // - boosted with linearPools[0], linearPools[1], linearPools[2]
      // - a single linearPool, linearPools[3]
      // Note proportions are referenced to parent nodes
      const linearPools = [
        {
          wrappedSymbol: 'aDAI',
          mainSymbol: 'DAI',
          balance: '1000000',
          proportion: '0.25',
        },
        {
          wrappedSymbol: 'aUSDC',
          mainSymbol: 'USDC',
          balance: '500000',
          proportion: '0.125',
        },
        {
          wrappedSymbol: 'aUSDT',
          mainSymbol: 'USDT',
          balance: '500000',
          proportion: '0.125',
        },
        {
          wrappedSymbol: 'aSTABLE',
          mainSymbol: 'STABLE',
          balance: '500000',
          proportion: '0.5',
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
      joinModule = new Join(poolProvider, Network.MAINNET);
    });

    it('testing', async () => {
      const inputTokens = [
        '0x6b175474e89094c44da98b954eedeac495271d0f',
        '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        '0xdac17f958d2ee523a2206206994597c13d831ec7',
        formatAddress('address_STABLE'),
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
        inputAmounts,
        userAddress
      );

      // TO DO - Add tests for correct call/action construction?
      // Ideally integration tests will cover actual call data success
    });
  });
});
