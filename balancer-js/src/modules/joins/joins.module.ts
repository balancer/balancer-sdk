import { Interface } from '@ethersproject/abi';
import { BalancerError, BalancerErrorCode } from '@/balancerErrors';
import { PoolRepository } from '../data';
import { PoolGraph, Node } from './graph';

import balancerRelayerAbi from '@/lib/abi/BalancerRelayer.json';
import { BigNumber } from 'ethers';
const balancerRelayerInterface = new Interface(balancerRelayerAbi);

export class Join {
  totalProportions: Record<string, BigNumber> = {};
  constructor(private pools: PoolRepository) {}

  async joinPool(
    poolId: string,
    expectedBPTOut: string,
    tokens: string[],
    amounts: string[]
  ): Promise<{
    to: string;
    data: string;
  }> {
    const rootPool = await this.pools.find(poolId);
    if (!rootPool) throw new BalancerError(BalancerErrorCode.POOL_DOESNT_EXIST);
    const poolsGraph = new PoolGraph(this.pools);

    const rootNode = await poolsGraph.buildGraphFromRootPool(poolId);
    const orderedNodes = poolsGraph.orderByBfs(rootNode);
    const calls = this.createActionCalls(
      orderedNodes,
      poolId,
      expectedBPTOut,
      tokens,
      amounts
    );
    const callData = balancerRelayerInterface.encodeFunctionData('multicall', [
      calls,
    ]);

    // const relayer = this.addresses.relayer;
    const relayer = 'todo';
    return {
      to: relayer,
      data: callData,
    };
  }

  createActionCalls(
    orderedNodes: Node[],
    rootId: string,
    expectedBPTOut: string,
    tokens: string[],
    amounts: string[]
  ): string[] {
    const calls: string[] = [];
    this.updateTotalProportions(orderedNodes);
    // Create actions for each Node and return in multicall array
    orderedNodes.forEach((node) => {
      let expectedOut = '0';
      if (node.id === rootId) expectedOut = expectedBPTOut;
      switch (node.action) {
        // TO DO - Add other Relayer supported Unwraps
        case 'wrapAaveDynamicToken':
          this.createAaveWrap(node);
          break;
        case 'batchSwap':
          this.createBatchSwap(node, expectedOut);
          break;
        case 'joinPool':
          this.createJoinPool(node, expectedOut);
          break;
        case 'input':
          this.createMainToken(node, tokens, amounts);
          break;
        default: {
          const inputs = node.children.map((t) => {
            return t.outputAmt;
          });
          console.log(
            'Unsupported action',
            node.type,
            node.address,
            node.action,
            `Inputs: ${inputs.toString()}`,
            `OutputRef: ${node.outputAmt}`,
            node.proportionOfParent.toString()
          );
        }
      }
    });
    return calls;
  }

  /*
  This creates a map of node address and total proportion.
  Useful for the case where there may be multiple inputs using same token, e.g. DAI input to 2 pools.
  */
  updateTotalProportions(nodes: Node[]): void {
    this.totalProportions = {};
    nodes.forEach((node) => {
      if (!this.totalProportions[node.address])
        this.totalProportions[node.address] = node.proportionOfParent;
      else
        this.totalProportions[node.address] = this.totalProportions[
          node.address
        ].add(this.totalProportions.proportionOfParent);
    });
  }

  /*
  These nodes don't have an action but create the correct proportional inputs for each token.
  These input amounts are then copied to the outputRef which the parent node will use.
  */
  createMainToken(node: Node, tokens: string[], amounts: string[]): void {
    // Update amounts to use actual value based off input and proportions
    const tokenIndex = tokens.indexOf(node.address);
    if (tokenIndex === -1) throw new Error('Input token doesnt exist');

    const totalProportion = this.totalProportions[node.address];
    const inputProportion = node.proportionOfParent
      .mul('1000000000000000000')
      .div(totalProportion);
    const inputAmount = inputProportion
      .mul(amounts[tokenIndex])
      .div('1000000000000000000');
    node.outputAmt = inputAmount.toString();
    console.log(
      node.type,
      node.address,
      node.action,
      `Inputs: ${inputAmount.toString()}`,
      `OutputRef: ${node.outputAmt}`,
      node.proportionOfParent.toString()
    );
  }

  createAaveWrap(node: Node): void {
    // TO DO - Create actual wrap call for Relayer multicall
    const inputs = node.children.map((t) => {
      return t.outputAmt;
    });
    console.log(
      node.type,
      node.address,
      `${node.action}(staticToken: ${
        node.address
      }, amount: ${inputs?.toString()}, outputRef: ${
        node.outputAmt
      }) prop: ${node.proportionOfParent.toString()}`
    );
  }

  createBatchSwap(node: Node, expectedOut: string): void {
    // TO DO - Create actual swap call for Relayer multicall
    const inputAmt = node.children[0].outputAmt;
    const inputToken = node.children[0].address;
    const outputToken = node.address;
    const expectedOutputAmount = expectedOut; // This could be used if joining a pool via a swap, e.g. Linear
    const poolId = node.id;
    console.log(
      node.type,
      node.address,
      `${
        node.action
      }(\n  inputAmt: ${inputAmt},\n  inputToken: ${inputToken},\n  pool: ${poolId},\n  outputToken: ${outputToken},\n  outputRef: ${
        node.outputAmt
      }\n) prop: ${node.proportionOfParent.toString()}`
    );
  }

  createJoinPool(node: Node, minAmountOut: string): void {
    // TO DO - Create actual joinPool for Relayer multicall
    // Handle token order correctly
    /*
    const userData = WeightedPoolEncoder.joinExactTokensInForBPTOut(
      sortedAmounts,
      minAmountOut
    );
    const attributes: JoinPool = {
      poolId: pool.id,
      sender: joiner,
      recipient: joiner,
      joinPoolRequest: {
        assets: sortedTokens,
        maxAmountsIn: sortedAmounts,
        userData,
        fromInternalBalance: false,
      },
    };
    */
    const poolId = node.id;
    const inputTokens = node.children.map((t) => t.address);
    const inputAmts = node.children.map((t) => t.outputAmt);
    console.log(
      node.type,
      node.address,
      `${
        node.action
      }(\n  poolId: ${poolId},\n  inputTokens: ${inputTokens.toString()},\n  maxAmtsIn: ${inputAmts.toString()},\n  minOut: ${minAmountOut}\n  outputRef: ${
        node.outputAmt
      }\n) prop: ${node.proportionOfParent.toString()}`
    );
  }
}
