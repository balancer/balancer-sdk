import { expect } from 'chai';
import { factories } from '@/test/factories';
import {
  BoostedParams,
  LinearParams,
  BoostedMetaBigParams,
  BoostedMetaBigInfo,
} from '@/test/factories/pools';
import { StaticPoolRepository } from '../data';
import { Pool } from '@/types';
import { Join } from './joins.module';
import { SubgraphPoolBase } from '@balancer-labs/sor';
import { Network } from '@/lib/constants/network';
import { formatAddress } from '@/test/lib/utils';
import { ADDRESSES } from '@/test/lib/constants';

const slippage = '0';

describe('Generalised Joins', () => {
  context('Boosted', () => {
    let joinModule: Join;
    let rootPool: SubgraphPoolBase;
    let userAddress: string;
    beforeEach(() => {
      userAddress = formatAddress('testAccount');
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
      joinModule = new Join(poolProvider, Network.GOERLI);
    });

    it('should throw when pool doesnt exist', async () => {
      let errorMessage = '';
      try {
        await joinModule.joinPool(
          'thisisntapool',
          [],
          [],
          userAddress,
          true,
          slippage
        );
      } catch (error) {
        errorMessage = (error as Error).message;
      }
      expect(errorMessage).to.eq('balancer pool does not exist');
    });

    // TODO - Remove when updated
    // it('should throw when non-leaf token is provided as input', async () => {
    //   let errorMessage = '';
    //   try {
    //     const inputTokens = [formatAddress('this is not a leaf token')];
    //     const inputAmounts = ['1000000000000000000'];
    //     await joinModule.joinPool(
    //       rootPool.id,
    //       '7777777',
    //       inputTokens,
    //       inputAmounts,
    //       userAddress,
    //       true
    //     );
    //   } catch (error) {
    //     errorMessage = (error as Error).message;
    //   }
    //   expect(errorMessage).to.eq('token mismatch');
    // });

    it('should throw when root pool is not ComposableStable', async () => {
      let errorMessage = '';
      try {
        rootPool.poolType = 'StablePhantom'; // changing type to test error handling
        const inputTokens = [formatAddress('tokenAddress')];
        const inputAmounts = ['1000000000000000000'];
        await joinModule.joinPool(
          rootPool.id,
          inputTokens,
          inputAmounts,
          userAddress,
          true,
          slippage
        );
      } catch (error) {
        errorMessage = (error as Error).message;
      }
      expect(errorMessage).to.eq('root pool type should be ComposableStable');
    });

    context('with wrapped tokens', () => {
      const isWrapped = true;
      it('all leaf tokens', async () => {
        const inputTokens = [
          '0x6b175474e89094c44da98b954eedeac495271d0f',
          '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          '0xdac17f958d2ee523a2206206994597c13d831ec7',
        ];
        const inputAmounts = ['1000000000000000000', '1000000', '1000000'];
        const root = await joinModule.joinPool(
          rootPool.id,
          inputTokens,
          inputAmounts,
          userAddress,
          isWrapped,
          slippage
        );
      });

      it('single leaf token', async () => {
        const inputTokens = ['0x6b175474e89094c44da98b954eedeac495271d0f'];
        const inputAmounts = ['1000000000000000000'];
        const root = await joinModule.joinPool(
          rootPool.id,
          inputTokens,
          inputAmounts,
          userAddress,
          isWrapped,
          slippage
        );
      });
    });

    context('with non-wrapped tokens', () => {
      const isWrapped = false;
      it('all leaf tokens', async () => {
        const inputTokens = [
          '0x6b175474e89094c44da98b954eedeac495271d0f',
          '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          '0xdac17f958d2ee523a2206206994597c13d831ec7',
        ];
        const inputAmounts = ['1000000000000000000', '1000000', '1000000'];
        const root = await joinModule.joinPool(
          rootPool.id,
          inputTokens,
          inputAmounts,
          userAddress,
          isWrapped,
          slippage
        );
      });

      it('single leaf token', async () => {
        const inputTokens = ['0x6b175474e89094c44da98b954eedeac495271d0f'];
        const inputAmounts = ['1000000000000000000'];
        const root = await joinModule.joinPool(
          rootPool.id,
          inputTokens,
          inputAmounts,
          userAddress,
          isWrapped,
          slippage
        );
      });
    });
    // TODO - Add tests for correct call/action construction?
    // TODO - Ideally integration tests will cover actual call data success
    // TODO - Lots of repeated code, could be refactored.
  });

  context('boostedMeta', () => {
    let joinModule: Join;
    let rootPool: SubgraphPoolBase;
    let userAddress: string;
    before(() => {
      userAddress = formatAddress('testAccount');

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
      joinModule = new Join(poolProvider, Network.GOERLI);
    });

    context('with wrapped tokens', () => {
      const isWrapped = true;

      it('all leaf tokens', async () => {
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
          rootPool.id,
          inputTokens,
          inputAmounts,
          userAddress,
          isWrapped,
          slippage
        );
      });

      it('single linear token', async () => {
        const inputTokens = [formatAddress('address_STABLE')];
        const inputAmounts = ['1000000000000000000'];
        const root = await joinModule.joinPool(
          rootPool.id,
          inputTokens,
          inputAmounts,
          userAddress,
          isWrapped,
          slippage
        );
      });

      it('single boosted leaf token', async () => {
        const inputTokens = ['0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'];
        const inputAmounts = ['1000000'];
        const root = await joinModule.joinPool(
          rootPool.id,
          inputTokens,
          inputAmounts,
          userAddress,
          isWrapped,
          slippage
        );
      });
    });

    context('with non-wrapped tokens', () => {
      const isWrapped = false;
      it('all leaf tokens', async () => {
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
          rootPool.id,
          inputTokens,
          inputAmounts,
          userAddress,
          isWrapped,
          slippage
        );
      });

      it('single linear token', async () => {
        const inputTokens = [formatAddress('address_STABLE')];
        const inputAmounts = ['1000000000000000000'];
        const root = await joinModule.joinPool(
          rootPool.id,
          inputTokens,
          inputAmounts,
          userAddress,
          isWrapped,
          slippage
        );
      });

      it('single boosted leaf token', async () => {
        const inputTokens = ['0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'];
        const inputAmounts = ['1000000'];
        const root = await joinModule.joinPool(
          rootPool.id,
          inputTokens,
          inputAmounts,
          userAddress,
          isWrapped,
          slippage
        );
      });
    });

    context('bpt input', () => {
      const isWrapped = false;
      it('only bpt in', async () => {
        const inputTokens = ['0x616464726573732d6368696c6400000000000000'];
        const inputAmounts = ['1000000000000000000'];
        const root = await joinModule.joinPool(
          rootPool.id,
          inputTokens,
          inputAmounts,
          userAddress,
          isWrapped,
          slippage
        );
      });

      it('bpt and leaf', async () => {
        const inputTokens = [
          '0x616464726573732d6368696c6400000000000000',
          ADDRESSES[Network.MAINNET].DAI.address,
        ];
        const inputAmounts = ['1000000000000000000', '1000000000000000000'];
        const root = await joinModule.joinPool(
          rootPool.id,
          inputTokens,
          inputAmounts,
          userAddress,
          isWrapped,
          slippage
        );
      });
    });
  });

  // TO DO - Add boostedMetaBig with different leaf tokens

  context('boostedMetaBig, has same leaf tokens', () => {
    let joinModule: Join;
    let rootPool: SubgraphPoolBase;
    let userAddress: string;
    let boostedMetaBigInfo: BoostedMetaBigInfo;
    before(() => {
      userAddress = formatAddress('testAccount');
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

      boostedMetaBigInfo = factories.boostedMetaBigPool
        .transient(parentPool)
        .build();
      rootPool = boostedMetaBigInfo.rootPool;
      const pools = [
        ...boostedMetaBigInfo.childPools,
        boostedMetaBigInfo.rootPool,
      ];
      // // Create staticPools provider with above pools
      const poolProvider = new StaticPoolRepository(pools as Pool[]);
      joinModule = new Join(poolProvider, 1);
    });

    context('with wrapped tokens', () => {
      const isWrapped = true;
      it('all leaf tokens', async () => {
        const inputTokens = [
          '0x6b175474e89094c44da98b954eedeac495271d0f',
          '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          '0xdac17f958d2ee523a2206206994597c13d831ec7',
        ];
        const inputAmounts = ['1000000000000000000', '1000000', '1000000'];
        const root = await joinModule.joinPool(
          rootPool.id,
          inputTokens,
          inputAmounts,
          userAddress,
          isWrapped,
          slippage
        );
      });

      it('single boosted leaf token', async () => {
        const inputTokens = ['0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'];
        const inputAmounts = ['1000000'];
        const root = await joinModule.joinPool(
          rootPool.id,
          inputTokens,
          inputAmounts,
          userAddress,
          isWrapped,
          slippage
        );
      });
    });

    context('with non-wrapped tokens', () => {
      const isWrapped = false;
      it('all leaf tokens', async () => {
        const inputTokens = [
          '0x6b175474e89094c44da98b954eedeac495271d0f',
          '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          '0xdac17f958d2ee523a2206206994597c13d831ec7',
        ];
        const inputAmounts = ['1000000000000000000', '1000000', '1000000'];
        const root = await joinModule.joinPool(
          rootPool.id,
          inputTokens,
          inputAmounts,
          userAddress,
          isWrapped,
          slippage
        );
      });

      it('single boosted leaf token', async () => {
        const inputTokens = ['0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'];
        const inputAmounts = ['1000000'];
        const root = await joinModule.joinPool(
          rootPool.id,
          inputTokens,
          inputAmounts,
          userAddress,
          isWrapped,
          slippage
        );
      });
    });
    context('bpt input', () => {
      const isWrapped = false;
      it('single bpt in', async () => {
        const inputTokens = [
          boostedMetaBigInfo.childPoolsInfo[0].rootPool.address,
        ];
        const inputAmounts = ['1000000000000000000'];
        const root = await joinModule.joinPool(
          rootPool.id,
          inputTokens,
          inputAmounts,
          userAddress,
          isWrapped,
          slippage
        );
        console.log(root.minOut, 'minOut');
      });
      it('two bpt in', async () => {
        const inputTokens = [
          boostedMetaBigInfo.childPoolsInfo[0].rootPool.address,
          boostedMetaBigInfo.childPoolsInfo[1].rootPool.address,
        ];
        const inputAmounts = ['7000000000000000000', '8000000000000000000'];
        const root = await joinModule.joinPool(
          rootPool.id,
          inputTokens,
          inputAmounts,
          userAddress,
          isWrapped,
          slippage
        );
        expect(root.minOut).to.eq('3000000000000000000');
      });

      it('bpt and leaf', async () => {
        const inputTokens = [
          boostedMetaBigInfo.childPools[0].address,
          ADDRESSES[Network.MAINNET].DAI.address,
        ];
        const inputAmounts = ['7000000000000000000', '8000000000000000000'];
        const root = await joinModule.joinPool(
          rootPool.id,
          inputTokens,
          inputAmounts,
          userAddress,
          isWrapped,
          slippage
        );
        expect(root.minOut).to.eq('3000000000000000000');
      });
    });
  });
});
