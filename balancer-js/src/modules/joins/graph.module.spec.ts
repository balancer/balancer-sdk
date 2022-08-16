import { expect } from 'chai';
import { parseFixed } from '@ethersproject/bignumber';
import { factories } from '@/test/factories';
import { StaticPoolRepository } from '../data';
import { Pool } from '@/types';
import { SubgraphPoolBase, SubgraphToken } from '@balancer-labs/sor';
import { PoolGraph, Node } from './graph';
import { BoostedPoolInfo } from '@/test/factories/pools';

function checkNode(
  node: Node,
  id: string,
  address: string,
  type: string,
  action: string,
  childLength: number,
  outputReference: string,
  proportionOfParent: string
): void {
  const proportionOfParentWei = parseFixed(proportionOfParent, 18);
  expect(node.id).to.eq(id);
  expect(node.address).to.eq(address);
  expect(node.type).to.eq(type);
  expect(node.action).to.eq(action);
  expect(node.children.length).to.eq(childLength);
  expect(node.outputReference).to.eq(outputReference);
  expect(node.proportionOfParent.toString()).to.eq(
    proportionOfParentWei.toString()
  );
}

function checkLinearNode(
  linearNode: Node,
  poolIndex: number,
  linearPools: SubgraphPoolBase[],
  wrappedTokens: SubgraphToken[],
  mainTokens: SubgraphToken[],
  expectedProportion: string,
  parentIndex: number
): void {
  let linearInputRef = 0;
  if (parentIndex != -1) linearInputRef = parentIndex + 1 + poolIndex * 3;
  checkNode(
    linearNode,
    linearPools[poolIndex].id,
    linearPools[poolIndex].address,
    'AaveLinear',
    'batchSwap',
    1,
    linearInputRef.toString(),
    expectedProportion
  );
  checkNode(
    linearNode.children[0],
    'N/A',
    wrappedTokens[poolIndex].address,
    'WrappedToken',
    'wrapAaveDynamicToken',
    1,
    (linearInputRef + 1).toString(),
    expectedProportion
  );
  checkNode(
    linearNode.children[0].children[0],
    'N/A',
    mainTokens[poolIndex].address,
    'Underlying',
    'input',
    0,
    (linearInputRef + 2).toString(),
    expectedProportion
  );
}

function checkBoosted(
  boostedNode: Node,
  boostedPoolInfo: BoostedPoolInfo
): void {
  const boostedIndex = 0;

  checkNode(
    boostedNode,
    boostedPoolInfo.boostedPool.id,
    boostedPoolInfo.boostedPool.address,
    'StablePhantom',
    'joinPool',
    3,
    boostedIndex.toString(),
    '1'
  );
  boostedNode.children.forEach((linearNode, i) => {
    checkLinearNode(
      linearNode,
      i,
      boostedPoolInfo.linearPools,
      boostedPoolInfo.wrappedTokens,
      boostedPoolInfo.mainTokens,
      boostedPoolInfo.linearProportions[i],
      boostedIndex
    );
  });
}

describe('Graph', () => {
  // TO DO - Add tests for other pool configs mentioned in Notion, metaBoosted, metaBigBoosted
  // Proportions

  // Single weightedPool

  context('boostedPool', () => {
    let boostedPoolInfo: BoostedPoolInfo;
    let boostedPool: SubgraphPoolBase;
    let poolsGraph: PoolGraph;

    before(() => {
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
      // Create staticPools provider with above pools
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

    it('should build linearPool graph', async () => {
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
        -1
      );
    });

    it('should build boostedPool graph', async () => {
      const boostedNode = await poolsGraph.buildGraphFromRootPool(
        boostedPool.id
      );
      // console.log(JSON.stringify(boostedNode, null, 2));
      checkBoosted(boostedNode, boostedPoolInfo);
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
});
