import { cloneDeep } from 'lodash'
import { BigNumber, BigNumberish, parseFixed } from '@ethersproject/bignumber'
import { AddressZero, WeiPerEther, Zero } from '@ethersproject/constants'

import { BalancerError, BalancerErrorCode } from '@/balancerErrors'
import { EncodeJoinPoolInput, Relayer } from '@/modules/relayer/relayer.module'
import {
  FundManagement,
  SingleSwap,
  Swap,
  SwapType,
} from '@/modules/swaps/types'
import { StablePoolEncoder } from '@/pool-stable'
import { BalancerNetworkConfig, JoinPoolRequest, PoolType } from '@/types'
import { PoolGraph, Node } from '../graph/graph'

import { subSlippage } from '@/lib/utils/slippageHelper'
import { networkAddresses } from '@/lib/constants/config'
import { AssetHelpers, getEthValue, isSameAddress, replace } from '@/lib/utils'
import {
  SolidityMaths,
  _computeScalingFactor,
  _upscale,
} from '@/lib/utils/solidityMaths'
import { calcPriceImpact } from '../pricing/priceImpact'
import { WeightedPoolEncoder } from '@/pool-weighted'
import { getPoolAddress } from '@/pool-utils'
import { Simulation, SimulationType } from '../simulation/simulation.module'
import { Requests, VaultModel } from '../vaultModel/vaultModel.module'
import { SwapRequest } from '../vaultModel/poolModel/swap'
import { JoinPoolRequest as JoinPoolModelRequest } from '../vaultModel/poolModel/join'
import { JsonRpcSigner } from '@ethersproject/providers'
import { BalancerRelayer__factory } from '@/contracts/factories/BalancerRelayer__factory'

const balancerRelayerInterface = BalancerRelayer__factory.createInterface()

// Quickly switch useful debug logs on/off
const DEBUG = false

function debugLog(log: string) {
  if (DEBUG) console.log(log)
}

export class Join {
  constructor(
    private relayer: string,
    private wrappedNativeAsset: string,
  ) {}

  private checkInputs(tokensIn: string[], amountsIn: string[]) {
    if (tokensIn.length === 0)
      throw new BalancerError(BalancerErrorCode.MISSING_TOKENS)

    if (amountsIn.every((a) => a === '0'))
      throw new BalancerError(BalancerErrorCode.JOIN_WITH_ZERO_AMOUNT)

    if (tokensIn.length != amountsIn.length)
      throw new BalancerError(BalancerErrorCode.INPUT_LENGTH_MISMATCH)

    if (
      tokensIn.some((t) => t === AddressZero) &&
      tokensIn.some(
        (t) => t.toLowerCase() === this.wrappedNativeAsset.toLowerCase()
      )
    )
      throw new BalancerError(BalancerErrorCode.INPUT_TOKEN_INVALID)
  }

  async buildJoin({
    orderedNodes,
    tokensIn,
    amountsIn,
    userAddress,
    authorisation,
    minBptOut,
  }: {
    orderedNodes: Node[]
    tokensIn: string[]
    amountsIn: string[]
    userAddress: string
    authorisation?: string
    minBptOut?: string
  }): Promise<{
    to: string
    data: string
    queryCall: string
    value: BigNumberish
  }> {
    this.checkInputs(tokensIn, amountsIn)

    const nativeAssetIndex = tokensIn.findIndex((t) => t === AddressZero)
    const nativeAssetValue = amountsIn[nativeAssetIndex]
    const isNativeAssetJoin = nativeAssetIndex !== -1
    const tokensInWithoutNativeAsset = replace(
      tokensIn,
      nativeAssetIndex,
      this.wrappedNativeAsset.toLowerCase()
    )

    const joinPaths = Join.getJoinPaths(
      orderedNodes,
      tokensInWithoutNativeAsset,
      amountsIn
    )

    /*
    - Create calls with 0 min bpt for each root join
    - static call (or V4 special call) to get actual amounts for each root join
    - Apply slippage to amounts
    - Recreate calls with minAmounts === actualAmountsWithSlippage
    - Return minAmoutOut (sum actualAmountsWithSlippage), UI would use this to display to user
    - Return updatedCalls, UI would use this to execute tx
    */
    // Create calls with 0 expected for each root join
    // Peek is enabled here so we can static call the returned amounts and use these to set limits
    debugLog(`\n--- Simulation Calls ---`)
    const {
      encodedCall,
      queryCall,
      deltas,
    } = this.createCalls(
      joinPaths,
      userAddress,
      isNativeAssetJoin,
      authorisation,
      undefined
    )

    // TODO: add this back once relayerV6 is released and we're able to peek while joining with ETH
    // const simulationValue = isNativeAssetJoin
    //   ? simulationDeltas[this.wrappedNativeAsset.toLowerCase()]
    //   : Zero;

    // static call (or V4 special call) to get actual amounts for each root join
    // const { amountsOut, totalAmountOut } = await this.amountsOutByJoinPath(
    //   userAddress,
    //   multiRequests,
    //   queryData,
    //   tokensInWithoutNativeAsset,
    //   outputIndexes,
    //   signer,
    //   simulationType,
    //   '0' // TODO: change to simulationValue.tosString() once relayerV6 is released
    // )

    // const { minAmountsOut, totalMinAmountOut } = this.minAmountsOutByJoinPath(
    //   slippage,
    //   amountsOut,
    //   totalAmountOut
    // )

    // Create calls with minAmountsOut
    debugLog(`\n--- Final Calls ---`)
    // const { encodedCall, deltas } = await this.createCalls(
    //   joinPaths,
    //   userAddress,
    //   isNativeAssetJoin,
    //   minAmountsOut,
    //   authorisation
    // )

    const value = isNativeAssetJoin
      ? nativeAssetValue
      : Zero

    debugLog(`Total value: ${value.toString()}`)

    // const poolAddress = orderedNodes[orderedNodes.length - 1].address;
    // this.assertDeltas(
    //   poolAddress,
    //   deltas,
    //   tokensInWithoutNativeAsset,
    //   amountsIn,
    //   totalMinAmountOut
    // )

    return {
      to: this.relayer,
      data: encodedCall,
      value,
      queryCall,
    }
  }

  // Create join paths from tokensIn all the way to the root node.
  static getJoinPaths = (
    orderedNodes: Node[],
    tokensIn: string[],
    amountsIn: string[]
  ): Node[][] => {
    const joinPaths: Node[][] = []

    // Filter all nodes that contain a token in the tokensIn array
    const inputNodes = orderedNodes.filter((node) =>
      tokensIn
        .filter((t, i) => BigNumber.from(amountsIn[i]).gt(0)) // Remove input tokens with 0 amounts
        .map((tokenIn) => tokenIn.toLowerCase())
        .includes(node.address.toLowerCase())
    )

    // If inputNodes contain at least one leaf token, then add path to join proportionally with all leaf tokens contained in tokensIn
    const containsLeafNode = inputNodes.some((node) => node.isLeaf)
    if (containsLeafNode) {
      joinPaths.push(orderedNodes)
    }

    // Add a join path for each non-leaf input node
    const nonLeafInputNodes = inputNodes.filter((node) => !node.isLeaf)
    nonLeafInputNodes.forEach((nonLeafInputNode) => {
      // Get amount in for current node
      const nonLeafAmountIn = amountsIn.find((amountIn, i) =>
        isSameAddress(tokensIn[i], nonLeafInputNode.address)
      ) as string
      // Split amount in between nodes with same non-leaf input token based on proportionOfParent
      const totalProportions = nonLeafInputNodes
        .filter((node) => isSameAddress(node.address, nonLeafInputNode.address))
        .reduce(
          (total, node) => total.add(node.proportionOfParent),
          BigNumber.from(0)
        )
      const proportionalNonLeafAmountIn = BigNumber.from(nonLeafAmountIn)
        .mul(nonLeafInputNode.proportionOfParent)
        .div(totalProportions)
        .toString()
      // Create input node for current non-leaf input token
      const [inputTokenNode] = PoolGraph.createInputTokenNode(
        0, // temp value that will be updated after creation
        nonLeafInputNode.address,
        nonLeafInputNode.decimals,
        nonLeafInputNode.parent,
        WeiPerEther,
        nonLeafInputNode.balance
      )
      // Update index to be actual amount in
      inputTokenNode.index = proportionalNonLeafAmountIn
      inputTokenNode.isLeaf = false
      // Start join path with input node
      const nonLeafJoinPath = [inputTokenNode]
      // Add each parent to the join path until we reach the root node
      let parent = inputTokenNode.parent
      let currentChild = inputTokenNode
      while (parent) {
        const parentCopy = cloneDeep(parent)
        parentCopy.children = parentCopy.children.map((child) => {
          if (child.address === currentChild.address) {
            // Replace original child with current child that was modified to handle the non-leaf join
            return currentChild
          } else {
            // Update index of siblings that are not within the join path to be 0
            return { ...child, index: '0' }
          }
        })
        nonLeafJoinPath.push(parentCopy)
        currentChild = parentCopy
        parent = parentCopy.parent
      }
      // Add join path to list of join paths
      joinPaths.push(nonLeafJoinPath)
    })

    // After creating all join paths, update the index of each input node to be the amount in for that node
    // All other node indexes will be used as a reference to store the amounts out for that node
    this.updateInputAmounts(joinPaths, tokensIn, amountsIn)

    return joinPaths
  };

  /*
  AmountsIn should be adjusted after being split between tokensIn to fix eventual rounding issues.
  This prevents the transaction to leave out dust amounts.
  */
  private static updateInputAmounts = (
    joinPaths: Node[][],
    tokensIn: string[],
    amountsIn: string[]
  ): void => {
    // Helper function to calculate and adjust amount difference for each token in
    const ajdustAmountInDiff = (
      tokenInInputNodes: Node[],
      amountIn: string
    ): void => {
      if (tokenInInputNodes.length > 1) {
        // Sum of amountsIn from each input node with same tokenIn
        const amountsInSumforTokenIn = tokenInInputNodes.reduce(
          (sum, currentNode) => sum.add(currentNode.index),
          BigNumber.from(0)
        )
        // Compare total amountIn with sum of amountIn split between each input node with same tokenIn
        const diff = BigNumber.from(amountIn).sub(amountsInSumforTokenIn)
        // Apply difference to first input node with same tokenIn
        tokenInInputNodes[0].index = diff
          .add(tokenInInputNodes[0].index)
          .toString()
      }
    }

    // Update amountsIn within leaf join path
    const leafJoinPath = joinPaths.find((joinPath) => joinPath[0].isLeaf)
    if (leafJoinPath) {
      // Update input proportions so inputs are shared correctly between leaf nodes with same tokenIn
      const totalProportions = this.updateTotalProportions(leafJoinPath)
      // Update input nodes to have correct input amount
      leafJoinPath.forEach((node) => {
        if (node.joinAction === 'input')
          node = this.updateNodeAmount(
            node,
            tokensIn,
            amountsIn,
            totalProportions
          )
      })
      // Adjust amountIn for each tokenIn to fix eventual rounding issues
      tokensIn.forEach((tokenIn, i) => {
        const tokenInInputNodes = leafJoinPath.filter(
          (inputNode) =>
            inputNode.isLeaf && isSameAddress(inputNode.address, tokenIn)
        )
        ajdustAmountInDiff(tokenInInputNodes, amountsIn[i])
      })
    }

    // Adjust amountsIn shared between non-leaf join paths with same tokenIn
    const nonLeafJoinPaths = joinPaths.filter(
      (joinPath) => !joinPath[0].isLeaf
    )
    if (nonLeafJoinPaths.length > 1) {
      tokensIn.forEach((tokenIn, i) => {
        const tokenInInputNodes = nonLeafJoinPaths
          .map((path) => path[0])
          .filter((node) => isSameAddress(node.address, tokenIn))
        ajdustAmountInDiff(tokenInInputNodes, amountsIn[i])
      })
    }
  };

  private createCalls(
    joinPaths: Node[][],
    userAddress: string,
    isNativeAssetJoin: boolean,
    authorisation?: string,
    minAmountsOut?: string[], // one for each joinPath
  ): {
    multiRequests: Requests[][]
    encodedCall: string
    queryCall: string
    outputIndexes: number[]
    deltas: Record<string, BigNumber>
  } {
    // Create calls for both leaf and non-leaf inputs
    const { multiRequests, encodedCalls, outputIndexes, deltas } =
      this.createActionCalls(
        joinPaths,
        userAddress,
        isNativeAssetJoin,
        minAmountsOut
      )

    // Query cannot include the authorisation call
    const queryCall = balancerRelayerInterface.encodeFunctionData('vaultActionsQueryMulticall', [encodedCalls])

    if (authorisation) {
      encodedCalls.unshift(this.createSetRelayerApproval(authorisation))
    }

    const encodedCall = balancerRelayerInterface.encodeFunctionData(
      'multicall',
      [encodedCalls]
    )

    return {
      multiRequests,
      encodedCall,
      queryCall,
      outputIndexes: authorisation
        ? outputIndexes.map((i) => i + 1)
        : outputIndexes,
      deltas,
    }
  };


  private updateDeltas(
    deltas: Record<string, BigNumber>,
    assets: string[],
    amounts: string[]
  ): Record<string, BigNumber> {
    assets.forEach((t, i) => {
      const asset = t.toLowerCase()
      if (!deltas[asset]) deltas[asset] = Zero
      deltas[asset] = deltas[asset].add(amounts[i])
    })
    return deltas
  }

  // Create actions for each Node and return in multicall array
  // Create calls for each path, use value stored in minBptAmounts if available
  private createActionCalls = (
    joinPaths: Node[][],
    userAddress: string,
    isNativeAssetJoin: boolean,
    minAmountsOut?: string[]
  ): {
    multiRequests: Requests[][]
    encodedCalls: string[]
    outputIndexes: number[]
    deltas: Record<string, BigNumber>
  } => {
    const multiRequests: Requests[][] = []
    const encodedCalls: string[] = []
    const outputIndexes: number[] = []
    const isSimulation = !minAmountsOut
    const deltas: Record<string, BigNumber> = {}

    joinPaths.forEach((joinPath, j) => {
      const isLeafJoin = joinPath[0].isLeaf
      const modelRequests: Requests[] = []

      joinPath.forEach((node, i) => {
        // Prevent adding action calls with input amounts equal 0
        if (
          node.children.length > 0 &&
          node.children.filter((c) => this.shouldBeConsidered(c)).length === 0
        ) {
          node.index = '0'
          return
        }

        // Sender's rule
        // 1. If any child node is an input node, tokens are coming from the user
        const hasChildInput = node.children
          .filter((c) => this.shouldBeConsidered(c))
          .some((c) => c.joinAction === 'input')
        const sender = hasChildInput ? userAddress : this.relayer

        // Recipient's rule
        // 1. Transactions with sibling input node must be sent to user because it will be the sender of the following transaction (per sender's rule above)
        // e.g. boostedMetaAlt - MAI/bbausd - joining with MAI from user and bbausd from earlier actions. MAI needs to come from user.
        // 2. Last transaction must be sent to the user
        // 3. Otherwise relayer
        // Note: scenario 1 usually happens with joinPool transactions that have both BPT and undelying tokens as tokensIn
        const isLastChainedCall = i === joinPath.length - 1
        const hasSiblingInput =
          (isLeafJoin && // non-leaf joins don't have siblings that should be considered
            node.parent?.children
              .filter((s) => this.shouldBeConsidered(s))
              .some((s) => s.joinAction === 'input')) ??
          false
        const recipient =
          isLastChainedCall || hasSiblingInput ? userAddress : this.relayer

        // Last action will use minBptOut to protect user. Middle calls can safely have 0 minimum as tx will revert if last fails.
        const minOut =
          isLastChainedCall && minAmountsOut ? minAmountsOut[j] : '0'

        switch (node.joinAction) {
          case 'batchSwap':
            {
              const { modelRequest, encodedCall, assets, amounts } =
                this.createSwap(
                  node,
                  j,
                  minOut,
                  sender,
                  recipient,
                  isNativeAssetJoin,
                  isSimulation
                )
              modelRequests.push(modelRequest)
              encodedCalls.push(encodedCall)
              this.updateDeltas(deltas, assets, amounts)
            }
            break
          case 'joinPool':
            {
              const { modelRequest, encodedCall, assets, amounts, minBptOut } =
                this.createJoinPool(
                  node,
                  j,
                  minOut,
                  sender,
                  recipient,
                  isNativeAssetJoin,
                  isSimulation
                )
              modelRequests.push(modelRequest)
              encodedCalls.push(encodedCall)
              this.updateDeltas(
                deltas,
                [node.address, ...assets],
                [minBptOut, ...amounts]
              )
            }
            break
          default:
            return
        }
      })
      if (isSimulation) {
        const outputRef = 100 * j
        const encodedPeekCall = Relayer.encodePeekChainedReferenceValue(
          Relayer.toChainedReference(outputRef, false)
        )
        encodedCalls.push(encodedPeekCall)
        outputIndexes.push(encodedCalls.indexOf(encodedPeekCall))
      }
      multiRequests.push(modelRequests)
    })

    return { multiRequests, encodedCalls, outputIndexes, deltas }
  };

  /**
   * Creates a map of node address and total proportion. Used for the case where there may be multiple inputs using same token, e.g. DAI input to 2 pools.
   * @param nodes nodes to consider.
   */
  static updateTotalProportions = (
    nodes: Node[]
  ): Record<string, BigNumber> => {
    const totalProportions: Record<string, BigNumber> = {}
    nodes.forEach((node) => {
      if (!totalProportions[node.address])
        totalProportions[node.address] = node.proportionOfParent
      else {
        totalProportions[node.address] = totalProportions[node.address].add(
          node.proportionOfParent
        )
      }
    })
    return totalProportions
  };

  /**
   * Uses relayer to approve itself to act in behalf of the user
   *
   * @param authorisation Encoded authorisation call.
   * @returns relayer approval call
   */
  private createSetRelayerApproval = (authorisation: string): string => {
    return Relayer.encodeSetRelayerApproval(this.relayer, true, authorisation)
  };

  static updateNodeAmount = (
    node: Node,
    tokensIn: string[],
    amountsIn: string[],
    totalProportions: Record<string, BigNumber>
  ): Node => {
    /*
    An input node requires a real amount (not an outputRef) as it is first node in chain.
    This amount will be used when chaining to parent.
    Amounts are split proportionally between all inputs with same token.
    */
    const tokenIndex = tokensIn
      .map((t) => t.toLowerCase())
      .indexOf(node.address.toLowerCase())
    if (tokenIndex === -1) {
      node.index = '0'
      return node
    }

    // Calculate proportional split
    const totalProportion = totalProportions[node.address]
    const inputProportion = node.proportionOfParent
      .mul((1e18).toString())
      .div(totalProportion)
    const inputAmount = inputProportion
      .mul(amountsIn[tokenIndex])
      .div((1e18).toString())
    // Update index with actual value
    node.index = inputAmount.toString()
    // console.log(
    //   `${node.type} ${node.address} prop: ${node.proportionOfParent.toString()}
    //   ${node.joinAction} (
    //     Inputs: ${inputAmount.toString()}
    //     OutputRef: ${node.index}
    //   )`
    // );
    return node
  };

  private createSwap = (
    node: Node,
    joinPathIndex: number,
    expectedOut: string,
    sender: string,
    recipient: string,
    isNativeAssetJoin: boolean,
    isSimulation: boolean
  ): {
    modelRequest: SwapRequest
    encodedCall: string
    assets: string[]
    amounts: string[]
  } => {
    // We only need swaps for main > linearBpt so shouldn't be more than token > token
    if (node.children.length !== 1) throw new Error('Unsupported swap')
    const tokenIn = node.children[0].address
    const amountIn = this.getOutputRefValue(joinPathIndex, node.children[0])

    // Single swap limits are always positive
    // Swap within generalisedJoin is always exactIn, so use minAmountOut to set limit
    const limit: string = expectedOut

    const assetIn =
      isNativeAssetJoin && !isSimulation
        ? this.replaceWrappedNativeAsset([tokenIn])[0]
        : tokenIn

    const request: SingleSwap = {
      poolId: node.id,
      kind: SwapType.SwapExactIn,
      assetIn,
      assetOut: node.address,
      amount: amountIn.value,
      userData: '0x',
    }

    const fromInternalBalance = this.allImmediateChildrenSendToInternal(node)
    const toInternalBalance = this.allSiblingsSendToInternal(node)

    const funds: FundManagement = {
      sender,
      recipient,
      fromInternalBalance,
      toInternalBalance,
    }

    const outputReference = BigNumber.from(
      this.getOutputRefValue(joinPathIndex, node).value
    )

    const value =
      isNativeAssetJoin && !isSimulation
        ? getEthValue([assetIn], [amountIn.value])
        : Zero

    const call: Swap = {
      request,
      funds,
      limit,
      deadline: BigNumber.from(Math.ceil(Date.now() / 1000) + 3600), // 1 hour from now
      value,
      outputReference,
    }

    const encodedCall = Relayer.encodeSwap(call)

    debugLog(`\nSwap:`)
    debugLog(`${JSON.stringify(call)}`)
    debugLog(`Partial value: ${JSON.stringify(call.value?.toString())}`)

    const modelRequest = VaultModel.mapSwapRequest(call)

    const hasChildInput = node.children.some((c) => c.joinAction === 'input')
    // If node has no child input the swap is part of a chain and token in shouldn't be considered for user deltas
    const userTokenIn = !hasChildInput ? '0' : amountIn.value
    // If node has parent the swap is part of a chain and BPT out shouldn't be considered for user deltas
    const userBptOut =
      node.parent != undefined
        ? '0'
        : BigNumber.from(expectedOut).mul(-1).toString() // needs to be negative because it's handled by the vault model as an amount going out of the vault

    const assets = [node.address, tokenIn]
    const amounts = [userBptOut, userTokenIn]

    return { modelRequest, encodedCall, assets, amounts }
  };

  private createJoinPool = (
    node: Node,
    joinPathIndex: number,
    minAmountOut: string,
    sender: string,
    recipient: string,
    isNativeAssetJoin: boolean,
    isSimulation: boolean
  ): {
    modelRequest: JoinPoolModelRequest
    encodedCall: string
    assets: string[]
    amounts: string[]
    minBptOut: string
  } => {
    const inputTokens: string[] = []
    const inputAmts: string[] = []

    // inputTokens needs to include each asset even if it has 0 amount
    node.children.forEach((child) => {
      inputTokens.push(child.address)
      // non-leaf joins should set input amounts only for children that are in their joinPath
      if (this.shouldBeConsidered(child)) {
        inputAmts.push(this.getOutputRefValue(joinPathIndex, child).value)
      } else {
        inputAmts.push('0')
      }
    })

    if (node.type === PoolType.ComposableStable) {
      // assets need to include the phantomPoolToken
      inputTokens.push(node.address)
      // need to add a placeholder so sorting works
      inputAmts.push('0')
    }

    // sort inputs
    const assetHelpers = new AssetHelpers(this.wrappedNativeAsset)
    const [sortedTokens, sortedAmounts] = assetHelpers.sortTokens(
      inputTokens,
      inputAmts
    ) as [string[], string[]]

    // userData amounts should not include the BPT of the pool being joined
    let userDataAmounts = []
    const bptIndex = sortedTokens
      .map((t) => t.toLowerCase())
      .indexOf(node.address.toLowerCase())
    if (bptIndex === -1) {
      userDataAmounts = sortedAmounts
    } else {
      userDataAmounts = [
        ...sortedAmounts.slice(0, bptIndex),
        ...sortedAmounts.slice(bptIndex + 1),
      ]
    }

    let userData: string
    if (node.type === PoolType.Weighted) {
      userData = WeightedPoolEncoder.joinExactTokensInForBPTOut(
        userDataAmounts,
        minAmountOut
      )
    } else {
      userData = StablePoolEncoder.joinExactTokensInForBPTOut(
        userDataAmounts,
        minAmountOut
      )
    }

    const value =
      isNativeAssetJoin && !isSimulation
        ? getEthValue(
          this.replaceWrappedNativeAsset(sortedTokens),
          sortedAmounts
        )
        : Zero

    const fromInternalBalance = this.allImmediateChildrenSendToInternal(node)

    const call: EncodeJoinPoolInput = Relayer.formatJoinPoolInput({
      poolId: node.id,
      kind: 0,
      sender,
      recipient,
      value,
      outputReference: this.getOutputRefValue(joinPathIndex, node).value,
      joinPoolRequest: {} as JoinPoolRequest,
      assets:
        isNativeAssetJoin && !isSimulation
          ? this.replaceWrappedNativeAsset(sortedTokens)
          : sortedTokens, // Must include BPT token
      maxAmountsIn: sortedAmounts,
      userData,
      fromInternalBalance,
    })
    const encodedCall = Relayer.encodeJoinPool(call)

    debugLog(`\nJoin:`)
    debugLog(JSON.stringify(call))
    debugLog(`Partial value: ${JSON.stringify(call.value?.toString())}`)
    const modelRequest = VaultModel.mapJoinPoolRequest(call)

    const userAmountsTokenIn = sortedAmounts.map((a) =>
      Relayer.isChainedReference(a) ? '0' : a
    )
    const userAmountOut = Relayer.isChainedReference(minAmountOut)
      ? '0'
      : minAmountOut

    const hasChildInput = node.children
      .filter((c) => this.shouldBeConsidered(c))
      .some((c) => c.joinAction === 'input')
    // If node has no child input the join is part of a chain and amounts in shouldn't be considered for user deltas
    const assets = !hasChildInput ? [] : sortedTokens
    const amounts = !hasChildInput ? [] : userAmountsTokenIn
    // If node has parent the join is part of a chain and shouldn't be considered for user deltas
    const minBptOut =
      node.parent != undefined
        ? Zero.toString()
        : Zero.sub(userAmountOut).toString() // -ve because coming from Vault

    return { modelRequest, encodedCall, assets, amounts, minBptOut }
  };

  private getOutputRefValue = (
    joinPathIndex: number,
    node: Node
  ): { value: string; isRef: boolean } => {
    if (node.joinAction === 'input') {
      // Input nodes have their indexes set as the actual input amount, instead of a chained reference
      return { value: node.index, isRef: false }
    } else if (node.index !== '0' || !node.parent) {
      // Root node (parent === undefined) has index zero, but should still pass chained reference as outputRef value
      return {
        value: Relayer.toChainedReference(
          BigNumber.from(node.index).add(joinPathIndex * 100)
        ).toString(),
        isRef: true,
      }
    } else {
      return {
        value: '0',
        isRef: true,
      }
    }
  };

  // Nodes with index 0 won't affect transactions so they shouldn't be considered
  private shouldBeConsidered = (node: Node): boolean => {
    return node.index !== '0'
  };

  // joinPool transaction always sends to non-internal balance
  // input always behave as sending to non-internal balance
  private sendsToInternalBalance = (node: Node): boolean => {
    return node.joinAction !== 'input' && node.joinAction !== 'joinPool'
  };

  private allImmediateChildrenSendToInternal = (node: Node): boolean => {
    const children = node.children.filter((c) => this.shouldBeConsidered(c))
    if (children.length === 0) return false
    return (
      children.filter((c) => this.sendsToInternalBalance(c)).length ===
      children.length
    )
  };

  private allSiblingsSendToInternal = (node: Node): boolean => {
    if (!node.parent) return false
    const siblings = node.parent.children.filter((s) =>
      this.shouldBeConsidered(s)
    )
    return (
      siblings.filter((s) => this.sendsToInternalBalance(s)).length ===
      siblings.length
    )
  };

  private replaceWrappedNativeAsset = (tokens: string[]): string[] => {
    const wrappedNativeAssetIndex = tokens.findIndex(
      (t) => t.toLowerCase() === this.wrappedNativeAsset.toLowerCase()
    )
    return replace(tokens, wrappedNativeAssetIndex, AddressZero)
  };
}
