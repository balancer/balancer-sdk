import { expect } from 'chai';
import { factories } from '@/test/factories';
import { StaticPoolRepository } from '../data';
import { Pool } from '@/types';
import { SubgraphPoolBase } from '@balancer-labs/sor';
import { PoolGraph, Node } from './graph';
import { BigNumber } from 'ethers';

describe('Graph', () => {
  // TO DO - Add tests for other pool configs mentioned in Notion, metaBoosted, metaBigBoosted
  // Proportions
  // Single weightedPool

  context('boostedPool', () => {
    let boostedPool: SubgraphPoolBase;
    let linearDAI: SubgraphPoolBase;
    let linearUSDC: SubgraphPoolBase;
    let linearUSDT: SubgraphPoolBase;
    let poolsGraph: PoolGraph;
    // Move this to a factory for 'boostedPool'?
    // TO DO - Add other phantomTokens
    const DAI = factories.subgraphToken
      .transient({ symbol: 'DAI', balance: '1000000' })
      .build();
    const wrappedaDai = factories.subgraphToken
      .transient({ symbol: 'aDAI', balance: '9700000' })
      .build();
    const phantomLinearDai = factories.subgraphToken
      .transient({
        symbol: 'bDAI',
        address: '0x804cdb9116a10bb78768d3252355a1b18067bf8f',
        balance: '5192296829399898',
      })
      .build();
    const wrappedaUsdc = factories.subgraphToken
      .transient({
        symbol: 'aUSDC',
        balance: '1000000',
      })
      .build();
    const wrappedaUsdt = factories.subgraphToken
      .transient({
        symbol: 'aUSDT',
        balance: '38000000',
      })
      .build();

    before(() => {
      linearDAI = factories.subgraphPoolBase.build({
        id: '0x804cdb9116a10bb78768d3252355a1b18067bf8f0000000000000000000000fb',
        address: '0x804cdb9116a10bb78768d3252355a1b18067bf8f',
        poolType: 'AaveLinear',
        tokens: [DAI, wrappedaDai, phantomLinearDai],
        wrappedIndex: 1,
        mainIndex: 0,
      });
      linearUSDC = factories.subgraphPoolBase.build({
        id: '0x9210f1204b5a24742eba12f710636d76240df3d00000000000000000000000fc',
        address: '0x9210f1204b5a24742eba12f710636d76240df3d0',
        poolType: 'AaveLinear',
        tokens: [
          factories.subgraphToken
            .transient({ symbol: 'USDC', balance: '6000000' })
            .build(),
          wrappedaUsdc,
        ],
        wrappedIndex: 1,
        mainIndex: 0,
      });
      linearUSDT = factories.subgraphPoolBase.build({
        id: '0x2bbf681cc4eb09218bee85ea2a5d3d13fa40fc0c0000000000000000000000fd',
        address: '0x2bbf681cc4eb09218bee85ea2a5d3d13fa40fc0c',
        poolType: 'AaveLinear',
        tokens: [
          factories.subgraphToken
            .transient({ symbol: 'USDT', balance: '2000000' })
            .build(),
          wrappedaUsdt,
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
              balance: '45000000',
            })
            .build(),
          factories.subgraphToken
            .transient({
              symbol: 'bUSDC',
              weight: '0',
              balance: '40000000',
            })
            .build(),
          factories.subgraphToken
            .transient({
              symbol: 'bUSDT',
              weight: '0',
              balance: '30000000',
            })
            .build(),
        ],
      });

      const pools = [linearDAI, linearUSDC, linearUSDT, boostedPool];
      // Create staticPools provider with above pools
      const poolProvider = new StaticPoolRepository(pools as Pool[]);
      poolsGraph = new PoolGraph(poolProvider);
    });

    function checkNode(
      node: Node,
      id: string,
      address: string,
      type: string,
      action: string,
      childLength: number,
      outputAmt: string,
      proportionOfParent: BigNumber
    ): void {
      expect(node.id).to.eq(id);
      expect(node.address).to.eq(address);
      expect(node.type).to.eq(type);
      expect(node.action).to.eq(action);
      expect(node.children.length).to.eq(childLength);
      expect(node.outputAmt).to.eq(outputAmt);
      expect(node.proportionOfParent.toString()).to.eq(
        proportionOfParent.toString()
      );
    }

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
      const rootNode = await poolsGraph.buildGraphFromRootPool(linearDAI.id);
      // console.log(JSON.stringify(rootNode, null, 2));
      checkNode(
        rootNode,
        linearDAI.id,
        linearDAI.address,
        'AaveLinear',
        'batchSwap',
        1,
        '0',
        BigNumber.from('1000000000000000000')
      );
      checkNode(
        rootNode.children[0],
        'N/A',
        wrappedaDai.address,
        'WrappedToken',
        'wrapAaveDynamicToken',
        1,
        '1',
        BigNumber.from('1000000000000000000')
      );
      checkNode(
        rootNode.children[0].children[0],
        'N/A',
        DAI.address,
        'Underlying',
        'input',
        0,
        '2',
        BigNumber.from('1000000000000000000')
      );
    });

    it('should build boostedPool graph', async () => {
      const rootNode = await poolsGraph.buildGraphFromRootPool(boostedPool.id);
      // console.log(JSON.stringify(rootNode, null, 2));
      checkNode(
        rootNode,
        boostedPool.id,
        boostedPool.address,
        'StablePhantom',
        'joinPool',
        3,
        '0',
        BigNumber.from('1000000000000000000')
      );
      checkNode(
        rootNode.children[0],
        linearDAI.id,
        linearDAI.address,
        'AaveLinear',
        'batchSwap',
        1,
        '1',
        BigNumber.from('391304347826086956')
      );
      checkNode(
        rootNode.children[0].children[0],
        'N/A',
        wrappedaDai.address,
        'WrappedToken',
        'wrapAaveDynamicToken',
        1,
        '2',
        BigNumber.from('391304347826086956')
      );
      checkNode(
        rootNode.children[0].children[0].children[0],
        'N/A',
        DAI.address,
        'Underlying',
        'input',
        0,
        '3',
        BigNumber.from('391304347826086956')
      );
      checkNode(
        rootNode.children[1],
        linearUSDC.id,
        linearUSDC.address,
        'AaveLinear',
        'batchSwap',
        1,
        '3',
        BigNumber.from('347826086956521739')
      );
      checkNode(
        rootNode.children[2],
        linearUSDT.id,
        linearUSDT.address,
        'AaveLinear',
        'batchSwap',
        1,
        '5',
        BigNumber.from('260869565217391304')
      );
      // TO DO - Check rest of graph
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
