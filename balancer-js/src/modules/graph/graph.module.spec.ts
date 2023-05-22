// yarn test:only src/modules/graph/graph.module.spec.ts
import { expect } from 'chai';
import { parseFixed } from '@ethersproject/bignumber';
import { factories } from '@/test/factories';
import { PoolsStaticRepository } from '../data';
import { SubgraphToken } from '@balancer-labs/sor';
import { PoolGraph, Node } from './graph';
import {
  BoostedInfo,
  BoostedMetaInfo,
  BoostedMetaBigInfo,
  BoostedParams,
  LinearParams,
  BoostedMetaBigParams,
  Pool,
  LinearInfo,
} from '@/test/factories/pools';
import { Pool as SdkPool } from '@/types';
import { formatAddress } from '@/test/lib/utils';

function checkNode(
  node: Node,
  expectedId: string,
  expectedAddress: string,
  expectedType: string,
  expectedJoinAction: string,
  expectedExitAction: string,
  childLength: number,
  expectedOutputReference: string,
  expectedProportionOfParent: string
): void {
  const proportionOfParentWei = parseFixed(expectedProportionOfParent, 18);
  expect(node.id).to.eq(expectedId);
  expect(node.address).to.eq(expectedAddress);
  expect(node.type).to.eq(expectedType);
  expect(node.joinAction).to.eq(expectedJoinAction);
  expect(node.exitAction).to.eq(expectedExitAction);
  expect(node.children.length).to.eq(childLength);
  expect(node.index).to.eq(expectedOutputReference);
  expect(node.proportionOfParent.toString()).to.eq(
    proportionOfParentWei.toString()
  );
}

/*
Check a Linear Node which should consist of:
LinearPool -> wrappedToken -> mainToken
*/
function checkLinearNode(
  linearNode: Node,
  poolIndex: number,
  linearPools: Pool[],
  wrappedTokens: SubgraphToken[],
  mainTokens: SubgraphToken[],
  expectedOutPutReference: number,
  tokensToUnwrap: string[]
): void {
  checkNode(
    linearNode,
    linearPools[poolIndex].id,
    linearPools[poolIndex].address,
    'AaveLinear',
    'batchSwap',
    'batchSwap',
    1,
    expectedOutPutReference.toString(),
    linearPools[poolIndex].proportionOfParent
  );
  const mainToken =
    linearPools[poolIndex].tokensList[
      linearPools[poolIndex].mainIndex as number
    ];
  if (tokensToUnwrap.includes(mainToken)) {
    checkNode(
      linearNode.children[0],
      'N/A',
      wrappedTokens[poolIndex].address,
      'WrappedToken',
      'wrap',
      'unwrap',
      1,
      (expectedOutPutReference + 1).toString(),
      linearPools[poolIndex].proportionOfParent
    );
    checkNode(
      linearNode.children[0].children[0],
      'N/A',
      mainTokens[poolIndex].address,
      'Input',
      'input',
      'output',
      0,
      (expectedOutPutReference + 2).toString(),
      linearPools[poolIndex].proportionOfParent
    );
  } else {
    checkNode(
      linearNode.children[0],
      'N/A',
      mainTokens[poolIndex].address,
      'Input',
      'input',
      'output',
      0,
      (expectedOutPutReference + 1).toString(),
      linearPools[poolIndex].proportionOfParent
    );
  }
}

/*
Checks a boostedPool, a phantomStable with all constituents being Linear.
*/
function checkBoosted(
  boostedNode: Node,
  boostedPool: Pool,
  boostedPoolInfo: BoostedInfo,
  boostedIndex: number,
  expectedProportionOfParent: string,
  tokensToUnwrap: string[]
): void {
  checkNode(
    boostedNode,
    boostedPool.id,
    boostedPool.address,
    'ComposableStable',
    'joinPool',
    'exitPool',
    3,
    boostedIndex.toString(),
    expectedProportionOfParent
  );
  boostedNode.children.forEach((linearNode, i) => {
    let linearInputRef;
    if (tokensToUnwrap.length > 0) linearInputRef = boostedIndex + 1 + i * 3;
    else linearInputRef = boostedIndex + 1 + i * 2;
    checkLinearNode(
      linearNode,
      i,
      boostedPoolInfo.linearPools,
      boostedPoolInfo.wrappedTokens,
      boostedPoolInfo.mainTokens,
      linearInputRef,
      tokensToUnwrap
    );
  });
}

/*
Checks a boostedMeta, a phantomStable with one Linear and one boosted.
*/
function checkBoostedMeta(
  rootNode: Node,
  boostedMetaInfo: BoostedMetaInfo,
  tokensToUnwrap: string[]
): void {
  // Check parent node
  checkNode(
    rootNode,
    boostedMetaInfo.rootInfo.pool.id,
    boostedMetaInfo.rootInfo.pool.address,
    'ComposableStable',
    'joinPool',
    'exitPool',
    2,
    '0',
    '1'
  );
  // Check child Boosted node
  checkBoosted(
    rootNode.children[0],
    boostedMetaInfo.childBoostedInfo.rootPool,
    boostedMetaInfo.childBoostedInfo,
    1,
    boostedMetaInfo.childBoostedInfo.proportion,
    tokensToUnwrap
  );
  let expectedOutputReference = 11;
  if (tokensToUnwrap.length === 0) expectedOutputReference = 8;
  // Check child Linear node
  checkLinearNode(
    rootNode.children[1],
    0,
    boostedMetaInfo.childLinearInfo.linearPools,
    boostedMetaInfo.childLinearInfo.wrappedTokens,
    boostedMetaInfo.childLinearInfo.mainTokens,
    expectedOutputReference,
    tokensToUnwrap
  );
}

/*
Checks a boostedBig, a phantomStable with two Boosted.
*/
function checkBoostedMetaBig(
  rootNode: Node,
  boostedMetaBigInfo: BoostedMetaBigInfo,
  tokensToUnwrap: string[]
): void {
  // Check parent node
  checkNode(
    rootNode,
    boostedMetaBigInfo.rootPool.id,
    boostedMetaBigInfo.rootPool.address,
    'ComposableStable',
    'joinPool',
    'exitPool',
    2,
    '0',
    '1'
  );
  let numberOfNodes = 1;
  rootNode.children.forEach((childBoosted, i) => {
    checkBoosted(
      rootNode.children[i],
      boostedMetaBigInfo.childPoolsInfo[i].rootPool,
      boostedMetaBigInfo.childPoolsInfo[i],
      numberOfNodes,
      boostedMetaBigInfo.childPoolsInfo[i].proportion,
      tokensToUnwrap
    );
    if (tokensToUnwrap.length > 0)
      numberOfNodes =
        boostedMetaBigInfo.childPoolsInfo[i].linearPools.length * 3 + 2;
    else
      numberOfNodes =
        boostedMetaBigInfo.childPoolsInfo[i].linearPools.length * 2 + 2;
  });
}

describe('Graph', () => {
  // Single weightedPool - the algo should work for single pools too?

  context('linearPool', () => {
    let linearInfo: LinearInfo;
    let poolsGraph: PoolGraph;
    let rootNode: Node;

    before(async () => {
      const linearPool = {
        tokens: {
          wrappedSymbol: 'aDAI',
          mainSymbol: 'DAI',
        },
        balance: '1000000',
      };

      linearInfo = factories.linearPools
        .transient({ pools: [linearPool] })
        .build();
      const poolProvider = new PoolsStaticRepository(
        linearInfo.linearPools as unknown as SdkPool[]
      );
      poolsGraph = new PoolGraph(poolProvider);
    });
    context('using non-wrapped tokens', () => {
      before(async () => {
        rootNode = await poolsGraph.buildGraphFromRootPool(
          linearInfo.linearPools[0].id,
          []
        );
      });
      it('should build single linearPool graph', async () => {
        checkLinearNode(
          rootNode,
          0,
          linearInfo.linearPools,
          linearInfo.wrappedTokens,
          linearInfo.mainTokens,
          0,
          []
        );
      });

      it('should sort in breadth first order', async () => {
        const orderedNodes = PoolGraph.orderByBfs(rootNode).reverse();
        expect(orderedNodes.length).to.eq(2);
        expect(orderedNodes[0].type).to.eq('Input');
        expect(orderedNodes[1].type).to.eq('AaveLinear');
      });
    });
  });

  context('boostedPool', () => {
    let boostedPoolInfo: BoostedInfo;
    let boostedPool: Pool;
    let poolsGraph: PoolGraph;
    let boostedNode: Node;

    before(async () => {
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
      boostedPoolInfo = factories.boostedPool
        .transient({
          linearPoolsParams: {
            pools: linearPools,
          },
          rootId: 'phantom_boosted_1',
          rootAddress: 'address_phantom_boosted_1',
        })
        .build();
      boostedPool = boostedPoolInfo.rootPool;
      const pools = [...boostedPoolInfo.linearPools, boostedPool];
      // Create staticPools provider with boosted and linear pools
      const poolProvider = new PoolsStaticRepository(
        pools as unknown as SdkPool[]
      );
      poolsGraph = new PoolGraph(poolProvider);
    });

    it('should throw when pool doesnt exist', async () => {
      let errorMessage = '';
      try {
        await poolsGraph.buildGraphFromRootPool('thisisntapool', []);
      } catch (error) {
        errorMessage = (error as Error).message;
      }
      expect(errorMessage).to.eq('balancer pool does not exist');
    });

    context('using wrapped tokens', () => {
      let tokensToUnwrap: string[];
      before(async () => {
        tokensToUnwrap = [
          '0x6b175474e89094c44da98b954eedeac495271d0f', // DAI
          '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
          '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
        ];
        boostedNode = await poolsGraph.buildGraphFromRootPool(
          boostedPool.id,
          tokensToUnwrap
        );
      });

      it('should build boostedPool graph', async () => {
        checkBoosted(
          boostedNode,
          boostedPoolInfo.rootPool,
          boostedPoolInfo,
          0,
          '1',
          tokensToUnwrap
        );
      });

      it('should sort in breadth first order', async () => {
        const orderedNodes = PoolGraph.orderByBfs(boostedNode).reverse();
        expect(orderedNodes.length).to.eq(10);
        expect(orderedNodes[0].type).to.eq('Input');
        expect(orderedNodes[1].type).to.eq('Input');
        expect(orderedNodes[2].type).to.eq('Input');
        expect(orderedNodes[3].type).to.eq('WrappedToken');
        expect(orderedNodes[4].type).to.eq('WrappedToken');
        expect(orderedNodes[5].type).to.eq('WrappedToken');
        expect(orderedNodes[6].type).to.eq('AaveLinear');
        expect(orderedNodes[7].type).to.eq('AaveLinear');
        expect(orderedNodes[8].type).to.eq('AaveLinear');
        expect(orderedNodes[9].type).to.eq('ComposableStable');
      });
    });

    context('using non-wrapped tokens', () => {
      before(async () => {
        boostedNode = await poolsGraph.buildGraphFromRootPool(
          boostedPool.id,
          []
        );
      });

      it('should build boostedPool graph', async () => {
        checkBoosted(
          boostedNode,
          boostedPoolInfo.rootPool,
          boostedPoolInfo,
          0,
          '1',
          []
        );
      });

      it('should sort in breadth first order', async () => {
        const orderedNodes = PoolGraph.orderByBfs(boostedNode).reverse();
        expect(orderedNodes.length).to.eq(7);
        expect(orderedNodes[0].type).to.eq('Input');
        expect(orderedNodes[1].type).to.eq('Input');
        expect(orderedNodes[2].type).to.eq('Input');
        expect(orderedNodes[3].type).to.eq('AaveLinear');
        expect(orderedNodes[4].type).to.eq('AaveLinear');
        expect(orderedNodes[5].type).to.eq('AaveLinear');
        expect(orderedNodes[6].type).to.eq('ComposableStable');
      });
    });
  });

  context('boostedMetaPool', () => {
    let boostedMetaInfo: BoostedMetaInfo;
    let rootPool: Pool;
    let poolsGraph: PoolGraph;
    let boostedNode: Node;

    before(async () => {
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
      boostedMetaInfo = factories.boostedMetaPool
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
      const poolProvider = new PoolsStaticRepository(
        pools as unknown as SdkPool[]
      );
      poolsGraph = new PoolGraph(poolProvider);
    });

    context('using wrapped tokens', () => {
      let tokensToUnwrap: string[];
      before(async () => {
        tokensToUnwrap = [
          '0x6b175474e89094c44da98b954eedeac495271d0f', // DAI
          '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
          '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
          formatAddress(`address_STABLE`),
        ];
        boostedNode = await poolsGraph.buildGraphFromRootPool(
          rootPool.id,
          tokensToUnwrap
        );
      });

      it('should build boostedPool graph', async () => {
        checkBoostedMeta(boostedNode, boostedMetaInfo, tokensToUnwrap);
      });

      it('should sort in breadth first order', async () => {
        const orderedNodes = PoolGraph.orderByBfs(boostedNode).reverse();
        expect(orderedNodes.length).to.eq(14);
        expect(orderedNodes[0].type).to.eq('Input');
        expect(orderedNodes[1].type).to.eq('Input');
        expect(orderedNodes[2].type).to.eq('Input');
        expect(orderedNodes[3].type).to.eq('Input');
        expect(orderedNodes[4].type).to.eq('WrappedToken');
        expect(orderedNodes[5].type).to.eq('WrappedToken');
        expect(orderedNodes[6].type).to.eq('WrappedToken');
        expect(orderedNodes[7].type).to.eq('WrappedToken');
        expect(orderedNodes[8].type).to.eq('AaveLinear');
        expect(orderedNodes[9].type).to.eq('AaveLinear');
        expect(orderedNodes[10].type).to.eq('AaveLinear');
        expect(orderedNodes[11].type).to.eq('AaveLinear');
        expect(orderedNodes[12].type).to.eq('ComposableStable');
        expect(orderedNodes[13].type).to.eq('ComposableStable');
      });
    });

    context('using non-wrapped tokens', () => {
      before(async () => {
        boostedNode = await poolsGraph.buildGraphFromRootPool(rootPool.id, []);
      });

      it('should build boostedPool graph', async () => {
        checkBoostedMeta(boostedNode, boostedMetaInfo, []);
      });

      it('should sort in breadth first order', async () => {
        const orderedNodes = PoolGraph.orderByBfs(boostedNode).reverse();
        expect(orderedNodes.length).to.eq(10);
        expect(orderedNodes[0].type).to.eq('Input');
        expect(orderedNodes[1].type).to.eq('Input');
        expect(orderedNodes[2].type).to.eq('Input');
        expect(orderedNodes[3].type).to.eq('Input');
        expect(orderedNodes[4].type).to.eq('AaveLinear');
        expect(orderedNodes[5].type).to.eq('AaveLinear');
        expect(orderedNodes[6].type).to.eq('AaveLinear');
        expect(orderedNodes[7].type).to.eq('AaveLinear');
        expect(orderedNodes[8].type).to.eq('ComposableStable');
        expect(orderedNodes[9].type).to.eq('ComposableStable');
      });
    });
  });

  context('boostedMetaBigPool', () => {
    let boostedMetaBigInfo: BoostedMetaBigInfo;
    let boostedPool: Pool;
    let poolsGraph: PoolGraph;
    let boostedNode: Node;

    before(async () => {
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
      boostedPool = boostedMetaBigInfo.rootPool;
      const pools = [
        ...boostedMetaBigInfo.childPools,
        boostedMetaBigInfo.rootPool,
      ];
      // // Create staticPools provider with above pools
      const poolProvider = new PoolsStaticRepository(
        pools as unknown as SdkPool[]
      );
      poolsGraph = new PoolGraph(poolProvider);
    });

    context('using wrapped tokens', () => {
      let tokensToUnwrap: string[];
      before(async () => {
        tokensToUnwrap = [
          '0x6b175474e89094c44da98b954eedeac495271d0f', // DAI
          '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
          '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
        ];
        boostedNode = await poolsGraph.buildGraphFromRootPool(
          boostedPool.id,
          tokensToUnwrap
        );
      });

      it('should build boostedPool graph', async () => {
        checkBoostedMetaBig(boostedNode, boostedMetaBigInfo, tokensToUnwrap);
      });

      it('should sort in breadth first order', async () => {
        const orderedNodes = PoolGraph.orderByBfs(boostedNode).reverse();
        expect(orderedNodes.length).to.eq(21);
        expect(orderedNodes[0].type).to.eq('Input');
        expect(orderedNodes[1].type).to.eq('Input');
        expect(orderedNodes[2].type).to.eq('Input');
        expect(orderedNodes[3].type).to.eq('Input');
        expect(orderedNodes[4].type).to.eq('Input');
        expect(orderedNodes[5].type).to.eq('Input');
        expect(orderedNodes[6].type).to.eq('WrappedToken');
        expect(orderedNodes[7].type).to.eq('WrappedToken');
        expect(orderedNodes[8].type).to.eq('WrappedToken');
        expect(orderedNodes[9].type).to.eq('WrappedToken');
        expect(orderedNodes[10].type).to.eq('WrappedToken');
        expect(orderedNodes[11].type).to.eq('WrappedToken');
        expect(orderedNodes[12].type).to.eq('AaveLinear');
        expect(orderedNodes[13].type).to.eq('AaveLinear');
        expect(orderedNodes[14].type).to.eq('AaveLinear');
        expect(orderedNodes[15].type).to.eq('AaveLinear');
        expect(orderedNodes[16].type).to.eq('AaveLinear');
        expect(orderedNodes[17].type).to.eq('AaveLinear');
        expect(orderedNodes[18].type).to.eq('ComposableStable');
        expect(orderedNodes[19].type).to.eq('ComposableStable');
        expect(orderedNodes[20].type).to.eq('ComposableStable');
      });
    });

    context('using non-wrapped tokens', () => {
      before(async () => {
        boostedNode = await poolsGraph.buildGraphFromRootPool(
          boostedPool.id,
          []
        );
      });

      it('should build boostedPool graph', async () => {
        checkBoostedMetaBig(boostedNode, boostedMetaBigInfo, []);
      });

      it('should sort in breadth first order', async () => {
        const orderedNodes = PoolGraph.orderByBfs(boostedNode).reverse();
        expect(orderedNodes.length).to.eq(15);
        expect(orderedNodes[0].type).to.eq('Input');
        expect(orderedNodes[1].type).to.eq('Input');
        expect(orderedNodes[2].type).to.eq('Input');
        expect(orderedNodes[3].type).to.eq('Input');
        expect(orderedNodes[4].type).to.eq('Input');
        expect(orderedNodes[5].type).to.eq('Input');
        expect(orderedNodes[6].type).to.eq('AaveLinear');
        expect(orderedNodes[7].type).to.eq('AaveLinear');
        expect(orderedNodes[8].type).to.eq('AaveLinear');
        expect(orderedNodes[9].type).to.eq('AaveLinear');
        expect(orderedNodes[10].type).to.eq('AaveLinear');
        expect(orderedNodes[11].type).to.eq('AaveLinear');
        expect(orderedNodes[12].type).to.eq('ComposableStable');
        expect(orderedNodes[13].type).to.eq('ComposableStable');
        expect(orderedNodes[14].type).to.eq('ComposableStable');
      });
    });
  });
});
