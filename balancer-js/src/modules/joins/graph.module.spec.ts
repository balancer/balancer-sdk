import { expect } from 'chai';
import { parseFixed } from '@ethersproject/bignumber';
import { factories } from '@/test/factories';
import { StaticPoolRepository } from '../data';
import { Pool } from '@/types';
import { SubgraphPoolBase, SubgraphToken } from '@balancer-labs/sor';
import { PoolGraph, Node } from './graph';
import { BoostedPoolInfo, BoostedMetaPoolInfo } from '@/test/factories/pools';

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
  linearPools: SubgraphPoolBase[],
  wrappedTokens: SubgraphToken[],
  mainTokens: SubgraphToken[],
  expectedProportion: string,
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
    expectedProportion
  );
  checkNode(
    linearNode.children[0],
    'N/A',
    wrappedTokens[poolIndex].address,
    'WrappedToken',
    'wrapAaveDynamicToken',
    1,
    (expectedOutPutReference + 1).toString(),
    expectedProportion
  );
  checkNode(
    linearNode.children[0].children[0],
    'N/A',
    mainTokens[poolIndex].address,
    'Underlying',
    'input',
    0,
    (expectedOutPutReference + 2).toString(),
    expectedProportion
  );
}

/*
Checks a boostedPool, a phantomStable with all constituents being Linear.
*/
function checkBoosted(
  boostedNode: Node,
  boostedPool: SubgraphPoolBase,
  boostedPoolInfo: BoostedPoolInfo,
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
      boostedPoolInfo.linearProportions[i],
      linearInputRef
    );
  });
}

/*
Checks a boostedMeta, a phantomStable with one Linear and one boosted.
*/
function checkBoostedMeta(
  boostedNode: Node,
  boostedPoolInfo: BoostedMetaPoolInfo
): void {
  // Check parent node
  checkNode(
    boostedNode,
    boostedPoolInfo.boostedPool.id,
    boostedPoolInfo.boostedPool.address,
    'StablePhantom',
    'joinPool',
    2,
    '0',
    '1'
  );
  // Check child Linear node
  checkLinearNode(
    boostedNode.children[1],
    3,
    boostedPoolInfo.linearPools,
    boostedPoolInfo.wrappedTokens,
    boostedPoolInfo.mainTokens,
    boostedPoolInfo.linearProportions[3],
    11
  );
  // Check child Boosted node
  checkBoosted(
    boostedNode.children[0],
    boostedPoolInfo.childBoostedPool.pool,
    boostedPoolInfo,
    1,
    boostedPoolInfo.childBoostedPool.proportion
  );
}

// TO DO - checkMetaBig, phantomStable with two boosted

describe('Graph', () => {
  // Single weightedPool - the algo should work for single pools too?

  context('boostedPool', () => {
    let boostedPoolInfo: BoostedPoolInfo;
    let boostedPool: SubgraphPoolBase;
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
      boostedPoolInfo = factories.boostedPool
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
      // Create staticPools provider with boosted and linear pools
      const poolProvider = new StaticPoolRepository(pools as Pool[]);
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

    it('should build single linearPool graph', async () => {
      const rootNode = await poolsGraph.buildGraphFromRootPool(
        boostedPoolInfo.linearPools[0].id
      );
      // console.log(JSON.stringify(rootNode, null, 2));
      checkLinearNode(
        rootNode,
        0,
        boostedPoolInfo.linearPools,
        boostedPoolInfo.wrappedTokens,
        boostedPoolInfo.mainTokens,
        '1',
        0
      );
    });

    it('should build boostedPool graph', async () => {
      const boostedNode = await poolsGraph.buildGraphFromRootPool(
        boostedPool.id
      );
      // console.log(JSON.stringify(boostedNode, null, 2));
      checkBoosted(
        boostedNode,
        boostedPoolInfo.boostedPool,
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
    let boostedPoolInfo: BoostedMetaPoolInfo;
    let boostedPool: SubgraphPoolBase;
    let poolsGraph: PoolGraph;

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
          parentProportion: '0.25', // 25% of boosted child
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
          parentProportion: '0.5', // 50% of root stablePool
        },
      ];
      boostedPoolInfo = factories.boostedMetaPool
        .transient({
          linearPoolsParams: {
            pools: linearPools,
          },
          id: 'address-parent',
          address: 'id-parent',
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
      poolsGraph = new PoolGraph(poolProvider);
    });

    it('should build boostedPool graph', async () => {
      const boostedNode = await poolsGraph.buildGraphFromRootPool(
        boostedPool.id
      );
      // console.log(JSON.stringify(boostedNode, null, 2));
      checkBoostedMeta(boostedNode, boostedPoolInfo);
    });

    it('should sort in breadth first order', async () => {
      const rootNode = await poolsGraph.buildGraphFromRootPool(boostedPool.id);
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
});
