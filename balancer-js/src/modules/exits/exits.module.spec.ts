import { expect } from 'chai';
import { factories } from '@/test/factories';
import {
  BoostedParams,
  LinearParams,
  BoostedMetaBigParams,
  BoostedMetaBigInfo,
  BoostedInfo,
} from '@/test/factories/pools';
import { StaticPoolRepository } from '../data';
import { Pool } from '@/types';
import { Exit } from './exits.module';
import { SubgraphPoolBase } from '@balancer-labs/sor';
import { Network } from '@/lib/constants/network';
import { JsonRpcProvider } from '@ethersproject/providers';

const network = Network.GOERLI;
const rpcUrl = 'http://127.0.0.1:8545';
const provider = new JsonRpcProvider(rpcUrl, network);
const signer = provider.getSigner();

describe('Generalised Exits', () => {
  let userAddress: string;
  before(async () => {
    userAddress = await signer.getAddress();
  });
  context('Boosted', () => {
    let exitModule: Exit;
    let rootPool: SubgraphPoolBase;
    let boostedInfo: BoostedInfo;
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
      boostedInfo = factories.boostedPool
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
      exitModule = new Exit(poolProvider, network);
    });

    context('Error conditions', () => {
      it('should throw when pool doesnt exist', async () => {
        let errorMessage = '';
        try {
          await exitModule.exitPool('thisisntapool', '', userAddress);
        } catch (error) {
          errorMessage = (error as Error).message;
        }
        expect(errorMessage).to.eq('balancer pool does not exist');
      });

      it('should throw when root pool is not ComposableStable', async () => {
        let errorMessage = '';
        try {
          rootPool.poolType = 'StablePhantom'; // changing type to test error handling
          const inputAmount = '1000000000000000000';
          await exitModule.exitPool(rootPool.id, inputAmount, userAddress);
        } catch (error) {
          errorMessage = (error as Error).message;
        }
        expect(errorMessage).to.eq('root pool type should be ComposableStable');
      });
    });

    context('Success conditions', () => {
      it('should build exit pool info', async () => {
        const inputAmount = '1000000000000000000';
        const exitPoolInfo = await exitModule.exitPool(
          rootPool.id,
          inputAmount,
          userAddress
        );
        expect(exitPoolInfo.tokensOut.length).to.eql(3);
        // TODO: add more relevant tests
      });
    });
  });

  context('boostedMeta', () => {
    let exitModule: Exit;
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
      // Create staticPools provider with above pools
      const poolProvider = new StaticPoolRepository(pools as Pool[]);
      exitModule = new Exit(poolProvider, network);
    });

    it('should build exit pool info', async () => {
      const inputAmount = '1000000000000000000';
      const exitPoolInfo = await exitModule.exitPool(
        rootPool.id,
        inputAmount,
        userAddress
      );
      expect(exitPoolInfo.tokensOut.length).to.eql(4);
      // TODO: add more relevant tests
    });
  });

  context('boostedMetaBig, has same leaf tokens', () => {
    let exitModule: Exit;
    let rootPool: SubgraphPoolBase;
    let boostedMetaBigInfo: BoostedMetaBigInfo;
    before(() => {
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
      const poolProvider = new StaticPoolRepository(pools as unknown as Pool[]);
      exitModule = new Exit(poolProvider, 1);
    });

    it('should build exit pool info', async () => {
      const inputAmount = '1000000000000000000';
      const exitPoolInfo = await exitModule.exitPool(
        rootPool.id,
        inputAmount,
        userAddress
      );
      expect(exitPoolInfo.tokensOut.length).to.eql(3);
      // TODO: add more relevant tests
    });
  });
});
