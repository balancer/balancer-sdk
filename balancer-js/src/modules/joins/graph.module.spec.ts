import { expect } from 'chai';
import { parseFixed } from '@ethersproject/bignumber';
import { factories } from '@/test/factories';
import { StaticPoolRepository } from '../data';
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

function checkNode(
  node: Node,
  expectedId: string,
  expectedAddress: string,
  expectedType: string,
  expectedAction: string,
  childLength: number,
  expectedOutputReference: string,
  expectedProportionOfParent: string
): void {
  const proportionOfParentWei = parseFixed(expectedProportionOfParent, 18);
  expect(node.id).to.eq(expectedId);
  expect(node.address).to.eq(expectedAddress);
  expect(node.type).to.eq(expectedType);
  expect(node.action).to.eq(expectedAction);
  expect(node.children.length).to.eq(childLength);
  expect(node.outputReference).to.eq(expectedOutputReference);
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
  expectedOutPutReference: number
): void {
  checkNode(
    linearNode,
    linearPools[poolIndex].id,
    linearPools[poolIndex].address,
    'AaveLinear',
    'batchSwap',
    1,
    expectedOutPutReference.toString(),
    linearPools[poolIndex].proportionOfParent
  );
  checkNode(
    linearNode.children[0],
    'N/A',
    wrappedTokens[poolIndex].address,
    'WrappedToken',
    'wrapAaveDynamicToken',
    1,
    (expectedOutPutReference + 1).toString(),
    linearPools[poolIndex].proportionOfParent
  );
  checkNode(
    linearNode.children[0].children[0],
    'N/A',
    mainTokens[poolIndex].address,
    'Underlying',
    'input',
    0,
    (expectedOutPutReference + 2).toString(),
    linearPools[poolIndex].proportionOfParent
  );
}

/*
Checks a boostedPool, a phantomStable with all constituents being Linear.
*/
function checkBoosted(
  boostedNode: Node,
  boostedPool: Pool,
  boostedPoolInfo: BoostedInfo,
  boostedIndex: number,
  expectedProportionOfParent: string
): void {
  checkNode(
    boostedNode,
    boostedPool.id,
    boostedPool.address,
    'StablePhantom',
    'joinPool',
    3,
    boostedIndex.toString(),
    expectedProportionOfParent
  );
  boostedNode.children.forEach((linearNode, i) => {
    const linearInputRef = boostedIndex + 1 + i * 3;
    checkLinearNode(
      linearNode,
      i,
      boostedPoolInfo.linearPools,
      boostedPoolInfo.wrappedTokens,
      boostedPoolInfo.mainTokens,
      linearInputRef
    );
  });
}

/*
Checks a boostedMeta, a phantomStable with one Linear and one boosted.
*/
function checkBoostedMeta(
  rootNode: Node,
  boostedMetaInfo: BoostedMetaInfo
): void {
  // Check parent node
  checkNode(
    rootNode,
    boostedMetaInfo.rootInfo.pool.id,
    boostedMetaInfo.rootInfo.pool.address,
    'StablePhantom',
    'joinPool',
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
    boostedMetaInfo.childBoostedInfo.proportion
  );
  // Check child Linear node
  checkLinearNode(
    rootNode.children[1],
    0,
    boostedMetaInfo.childLinearInfo.linearPools,
    boostedMetaInfo.childLinearInfo.wrappedTokens,
    boostedMetaInfo.childLinearInfo.mainTokens,
    11
  );
}

/*
Checks a boostedBig, a phantomStable with two Boosted.
*/
function checkBoostedMetaBig(
  rootNode: Node,
  boostedMetaBigInfo: BoostedMetaBigInfo
): void {
  // Check parent node
  checkNode(
    rootNode,
    boostedMetaBigInfo.rootPool.id,
    boostedMetaBigInfo.rootPool.address,
    'StablePhantom',
    'joinPool',
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
      boostedMetaBigInfo.childPoolsInfo[i].proportion
    );
    numberOfNodes =
      boostedMetaBigInfo.childPoolsInfo[i].linearPools.length * 3 + 2;
  });
}

describe('Graph', () => {
  // Single weightedPool - the algo should work for single pools too?

  context('linearPool', () => {
    let linearInfo: LinearInfo;
    let poolsGraph: PoolGraph;

    before(() => {
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
      const poolProvider = new StaticPoolRepository(
        linearInfo.linearPools as SdkPool[]
      );
      poolsGraph = new PoolGraph(poolProvider);
    });

    it('should build single linearPool graph', async () => {
      const rootNode = await poolsGraph.buildGraphFromRootPool(
        linearInfo.linearPools[0].id
      );
      // console.log(JSON.stringify(rootNode, null, 2));
      checkLinearNode(
        rootNode,
        0,
        linearInfo.linearPools,
        linearInfo.wrappedTokens,
        linearInfo.mainTokens,
        0
      );
    });

    it('should sort in breadth first order', async () => {
      const rootNode = await poolsGraph.buildGraphFromRootPool(
        linearInfo.linearPools[0].id
      );
      const orderedNodes = poolsGraph.orderByBfs(rootNode);
      expect(orderedNodes[0].type).to.eq('Underlying');
      expect(orderedNodes[1].type).to.eq('WrappedToken');
      expect(orderedNodes[2].type).to.eq('AaveLinear');
    });
  });

  context('boostedPool', () => {
    let boostedPoolInfo: BoostedInfo;
    let boostedPool: Pool;
    let poolsGraph: PoolGraph;

    before(() => {
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
      const poolProvider = new StaticPoolRepository(pools as SdkPool[]);
      poolsGraph = new PoolGraph(poolProvider);
    });

    it('should throw when pool doesnt exist', async () => {
      let errorMessage = '';
      try {
        await poolsGraph.buildGraphFromRootPool('thisisntapool');
      } catch (error) {
        errorMessage = (error as Error).message;
      }
      expect(errorMessage).to.eq('balancer pool does not exist');
    });

    it('should build boostedPool graph', async () => {
      const boostedNode = await poolsGraph.buildGraphFromRootPool(
        boostedPool.id
      );
      // console.log(JSON.stringify(boostedNode, null, 2));
      checkBoosted(
        boostedNode,
        boostedPoolInfo.rootPool,
        boostedPoolInfo,
        0,
        '1'
      );
    });

    it('should sort in breadth first order', async () => {
      const rootNode = await poolsGraph.buildGraphFromRootPool(boostedPool.id);
      const orderedNodes = poolsGraph.orderByBfs(rootNode);
      expect(orderedNodes[0].type).to.eq('Underlying');
      expect(orderedNodes[1].type).to.eq('Underlying');
      expect(orderedNodes[2].type).to.eq('Underlying');
      expect(orderedNodes[3].type).to.eq('WrappedToken');
      expect(orderedNodes[4].type).to.eq('WrappedToken');
      expect(orderedNodes[5].type).to.eq('WrappedToken');
      expect(orderedNodes[6].type).to.eq('AaveLinear');
      expect(orderedNodes[7].type).to.eq('AaveLinear');
      expect(orderedNodes[8].type).to.eq('AaveLinear');
      expect(orderedNodes[9].type).to.eq('StablePhantom');
    });
  });

  context('boostedMetaPool', () => {
    let boostedMetaInfo: BoostedMetaInfo;
    let rootPool: Pool;
    let poolsGraph: PoolGraph;

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
      const poolProvider = new StaticPoolRepository(pools as SdkPool[]);
      poolsGraph = new PoolGraph(poolProvider);
    });

    it('should build boostedPool graph', async () => {
      const boostedNode = await poolsGraph.buildGraphFromRootPool(rootPool.id);
      // console.log(JSON.stringify(boostedNode, null, 2));
      checkBoostedMeta(boostedNode, boostedMetaInfo);
    });

    it('should sort in breadth first order', async () => {
      const rootNode = await poolsGraph.buildGraphFromRootPool(rootPool.id);
      const orderedNodes = poolsGraph.orderByBfs(rootNode);
      expect(orderedNodes[0].type).to.eq('Underlying');
      expect(orderedNodes[1].type).to.eq('Underlying');
      expect(orderedNodes[2].type).to.eq('Underlying');
      expect(orderedNodes[3].type).to.eq('Underlying');
      expect(orderedNodes[4].type).to.eq('WrappedToken');
      expect(orderedNodes[5].type).to.eq('WrappedToken');
      expect(orderedNodes[6].type).to.eq('WrappedToken');
      expect(orderedNodes[7].type).to.eq('WrappedToken');
      expect(orderedNodes[8].type).to.eq('AaveLinear');
      expect(orderedNodes[9].type).to.eq('AaveLinear');
      expect(orderedNodes[10].type).to.eq('AaveLinear');
      expect(orderedNodes[11].type).to.eq('AaveLinear');
      expect(orderedNodes[12].type).to.eq('StablePhantom');
      expect(orderedNodes[11].type).to.eq('AaveLinear');
      expect(orderedNodes[12].type).to.eq('StablePhantom');
    });
  });

  context('boostedMetaBigPool', () => {
    let boostedMetaBigInfo: BoostedMetaBigInfo;
    let boostedPool: Pool;
    let poolsGraph: PoolGraph;

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

      boostedMetaBigInfo = factories.boostedMetaBigPool
        .transient(parentPool)
        .build();
      boostedPool = boostedMetaBigInfo.rootPool;
      const pools = [
        ...boostedMetaBigInfo.childPools,
        boostedMetaBigInfo.rootPool,
      ];
      // // Create staticPools provider with above pools
      const poolProvider = new StaticPoolRepository(pools as SdkPool[]);
      poolsGraph = new PoolGraph(poolProvider);
    });

    it('should build boostedPool graph', async () => {
      const boostedNode = await poolsGraph.buildGraphFromRootPool(
        boostedPool.id
      );
      // console.log(JSON.stringify(boostedNode, null, 2));
      checkBoostedMetaBig(boostedNode, boostedMetaBigInfo);
    });

    it('should sort in breadth first order', async () => {
      const rootNode = await poolsGraph.buildGraphFromRootPool(boostedPool.id);
      const orderedNodes = poolsGraph.orderByBfs(rootNode);
      expect(orderedNodes.length).to.eq(21);
      expect(orderedNodes[0].type).to.eq('Underlying');
      expect(orderedNodes[1].type).to.eq('Underlying');
      expect(orderedNodes[2].type).to.eq('Underlying');
      expect(orderedNodes[3].type).to.eq('Underlying');
      expect(orderedNodes[4].type).to.eq('Underlying');
      expect(orderedNodes[5].type).to.eq('Underlying');
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
      expect(orderedNodes[18].type).to.eq('StablePhantom');
      expect(orderedNodes[19].type).to.eq('StablePhantom');
      expect(orderedNodes[20].type).to.eq('StablePhantom');
    });
  });
});
