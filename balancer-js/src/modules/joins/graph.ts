import { BalancerError, BalancerErrorCode } from '@/balancerErrors';
import { Pool, PoolType } from '@/types';
import { BigNumber } from 'ethers';
import { PoolRepository } from '../data';

export interface Node {
  address: string;
  id: string;
  action: Actions;
  type: string;
  children: Node[];
  marked: boolean;
  outputAmt: string;
  proportionOfParent: BigNumber;
}

type Actions =
  | 'input'
  | 'batchSwap'
  | 'wrap'
  | 'joinPool'
  | 'wrapAaveDynamicToken'
  | 'wrapERC4626';
const joinActions = new Map<PoolType, Actions>();
joinActions.set(PoolType.AaveLinear, 'batchSwap');
joinActions.set(PoolType.ERC4626Linear, 'batchSwap');
joinActions.set(PoolType.Element, 'batchSwap');
joinActions.set(PoolType.Investment, 'joinPool');
joinActions.set(PoolType.LiquidityBootstrapping, 'joinPool');
joinActions.set(PoolType.MetaStable, 'joinPool');
joinActions.set(PoolType.Stable, 'joinPool');
joinActions.set(PoolType.StablePhantom, 'joinPool');
joinActions.set(PoolType.Weighted, 'joinPool');

export class PoolGraph {
  constructor(private pools: PoolRepository) {}

  async buildGraphFromRootPool(poolId: string): Promise<Node> {
    const rootPool = await this.pools.find(poolId);
    if (!rootPool) throw new BalancerError(BalancerErrorCode.POOL_DOESNT_EXIST);
    const nodeIndex = 0;
    const rootNode = await this.buildGraphFromPool(
      rootPool.address,
      nodeIndex,
      BigNumber.from('1000000000000000000')
    );
    return rootNode[0];
  }

  getTokenTotal(pool: Pool): BigNumber {
    const bptIndex = pool.tokensList.indexOf(pool.address);
    let total = BigNumber.from('0');
    pool.tokens.forEach((token, i) => {
      if (bptIndex !== i) {
        total = total.add(token.balance);
      }
    });
    return total;
  }

  async buildGraphFromPool(
    address: string,
    nodeIndex: number,
    proportionOfParent: BigNumber
  ): Promise<[Node, number]> {
    const pool = await this.pools.findBy('address', address);
    if (!pool) throw new BalancerError(BalancerErrorCode.POOL_DOESNT_EXIST);
    const action = joinActions.get(pool.poolType);
    if (!action)
      throw new BalancerError(BalancerErrorCode.UNSUPPORTED_POOL_TYPE);

    const tokenTotal = this.getTokenTotal(pool);

    let poolNode: Node = {
      address: pool.address,
      id: pool.id,
      type: pool.poolType,
      action,
      children: [],
      marked: false,
      outputAmt: nodeIndex.toString(),
      proportionOfParent,
    };
    nodeIndex++;
    if (pool.poolType.toString().includes('Linear')) {
      [poolNode, nodeIndex] = this.createLinearNodeChildren(
        poolNode,
        nodeIndex,
        pool
      );
    } else {
      for (let i = 0; i < pool.tokens.length; i++) {
        const proportion = BigNumber.from(pool.tokens[i].balance)
          .mul('1000000000000000000')
          .div(tokenTotal);
        const finalProportion = proportion
          .mul(proportionOfParent)
          .div('1000000000000000000');
        const childNode = await this.buildGraphFromPool(
          pool.tokens[i].address,
          nodeIndex,
          finalProportion
        );
        nodeIndex = childNode[1];
        if (childNode[0]) poolNode.children.push(childNode[0]);
      }
    }
    return [poolNode, nodeIndex];
  }

  createLinearNodeChildren(
    linearPoolNode: Node,
    nodeIndex: number,
    linearPool: Pool
  ): [Node, number] {
    // Linear pool will be joined via wrapped token. This will be the child node.
    const wrappedNodeInfo = this.createWrappedTokenNode(
      linearPool,
      nodeIndex,
      linearPoolNode.proportionOfParent
    );
    linearPoolNode.children.push(wrappedNodeInfo[0]);
    return [linearPoolNode, wrappedNodeInfo[1]];
  }

  createWrappedTokenNode(
    linearPool: Pool,
    nodeIndex: number,
    proportionOfParent: BigNumber
  ): [Node, number] {
    if (linearPool.wrappedIndex === undefined)
      throw new Error('Issue With Linear Pool');

    // Relayer can support different wrapped tokens
    let action: Actions = 'wrapAaveDynamicToken';
    switch (linearPool.poolType) {
      case PoolType.ERC4626Linear:
        action = 'wrapERC4626';
    }

    const wrappedTokenNode: Node = {
      type: 'WrappedToken',
      address: linearPool.tokensList[linearPool.wrappedIndex],
      id: 'N/A',
      children: [],
      marked: false,
      action,
      outputAmt: nodeIndex.toString(),
      proportionOfParent,
    };
    nodeIndex++;
    // Wrapped token will be wrapped via the main token. This will be the child node.
    const nodeInfo = this.createMainTokenNode(
      linearPool,
      nodeIndex,
      proportionOfParent
    );
    wrappedTokenNode.children = [nodeInfo[0]];
    nodeIndex = nodeInfo[1];
    return [wrappedTokenNode, nodeIndex];
  }

  createMainTokenNode(
    linearPool: Pool,
    nodeIndex: number,
    proportionOfParent: BigNumber
  ): [Node, number] {
    if (linearPool.mainIndex === undefined)
      throw new Error('Issue With Linear Pool');
    return [
      {
        address: linearPool.tokensList[linearPool.mainIndex],
        id: 'N/A',
        type: 'Underlying',
        children: [],
        marked: false,
        action: 'input',
        outputAmt: nodeIndex.toString(),
        proportionOfParent: proportionOfParent,
      },
      nodeIndex++,
    ];
  }

  orderByBfs(root: Node): Node[] {
    // Breadth first traversal of graph
    const nodes: Node[] = [];
    const orderedNodes: Node[] = [];
    root.marked = true;
    nodes.push(root);
    while (nodes.length > 0) {
      const currentNode = nodes.shift(); // removes first
      if (currentNode) orderedNodes.push(currentNode);
      currentNode?.children.forEach((c) => {
        if (!c.marked) {
          c.marked = true;
          nodes.push(c);
        }
      });
    }
    return orderedNodes.reverse();
  }
}
