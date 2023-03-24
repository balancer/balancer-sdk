import { JsonRpcSigner } from '@ethersproject/providers';
import { BigNumberish, BigNumber } from '@ethersproject/bignumber';
import { Interface } from '@ethersproject/abi';
import { MaxUint256, WeiPerEther } from '@ethersproject/constants';
import { Vault } from '@/contracts/Vault';

import { Swaps } from '@/modules/swaps/swaps.module';
import { BalancerError, BalancerErrorCode } from '@/balancerErrors';
import {
  EncodeBatchSwapInput,
  OutputReference,
  EncodeExitPoolInput,
  EncodeJoinPoolInput,
  ExitAndBatchSwapInput,
  ExitPoolData,
  JoinPoolData,
} from './types';
import {
  TransactionData,
  ExitPoolRequest,
  JoinPoolRequest,
  BalancerSdkConfig,
} from '@/types';
import { SwapType, FundManagement, Swap } from '../swaps/types';
import { SubgraphPoolBase } from '@balancer-labs/sor';
import { RelayerAuthorization } from '@/lib/utils';

import relayerLibraryAbi from '@/lib/abi/BatchRelayerLibrary.json';

export * from './types';

const relayerLibrary = new Interface(relayerLibraryAbi);

export class Relayer {
  private readonly swaps: Swaps;

  static CHAINED_REFERENCE_TEMP_PREFIX = 'ba10'; // Temporary reference: it is deleted after a read.
  static CHAINED_REFERENCE_READONLY_PREFIX = 'ba11'; // Read-only reference: it is not deleted after a read.

  constructor(swapsOrConfig: Swaps | BalancerSdkConfig) {
    if (swapsOrConfig instanceof Swaps) {
      this.swaps = swapsOrConfig;
    } else {
      this.swaps = new Swaps(swapsOrConfig);
    }
  }

  static encodeApproveVault(tokenAddress: string, maxAmount: string): string {
    return relayerLibrary.encodeFunctionData('approveVault', [
      tokenAddress,
      maxAmount,
    ]);
  }

  static encodeSetRelayerApproval(
    relayerAdress: string,
    approved: boolean,
    authorisation: string
  ): string {
    return relayerLibrary.encodeFunctionData('setRelayerApproval', [
      relayerAdress,
      approved,
      authorisation,
    ]);
  }

  static encodeGaugeWithdraw(
    gaugeAddress: string,
    sender: string,
    recipient: string,
    amount: string
  ): string {
    return relayerLibrary.encodeFunctionData('gaugeWithdraw', [
      gaugeAddress,
      sender,
      recipient,
      amount,
    ]);
  }

  static encodeGaugeDeposit(
    gaugeAddress: string,
    sender: string,
    recipient: string,
    amount: string
  ): string {
    return relayerLibrary.encodeFunctionData('gaugeDeposit', [
      gaugeAddress,
      sender,
      recipient,
      amount,
    ]);
  }

  static encodeSwap(params: Swap): string {
    return relayerLibrary.encodeFunctionData('swap', [
      params.request,
      params.funds,
      params.limit,
      params.deadline,
      params.value,
      params.outputReference,
    ]);
  }

  static encodeBatchSwap(params: EncodeBatchSwapInput): string {
    return relayerLibrary.encodeFunctionData('batchSwap', [
      params.swapType,
      params.swaps,
      params.assets,
      params.funds,
      params.limits,
      params.deadline,
      params.value,
      params.outputReferences,
    ]);
  }

  static encodeExitPool(params: EncodeExitPoolInput): string {
    return relayerLibrary.encodeFunctionData('exitPool', [
      params.poolId,
      params.poolKind,
      params.sender,
      params.recipient,
      params.exitPoolRequest,
      params.outputReferences,
    ]);
  }

  static encodeJoinPool(params: EncodeJoinPoolInput): string {
    return relayerLibrary.encodeFunctionData('joinPool', [
      params.poolId,
      params.kind,
      params.sender,
      params.recipient,
      params.joinPoolRequest,
      params.value,
      params.outputReference,
    ]);
  }

  static encodePeekChainedReferenceValue(reference: BigNumberish): string {
    return relayerLibrary.encodeFunctionData('peekChainedReferenceValue', [
      reference,
    ]);
  }

  static toChainedReference(key: BigNumberish, isTemporary = true): BigNumber {
    const prefix = isTemporary
      ? Relayer.CHAINED_REFERENCE_TEMP_PREFIX
      : Relayer.CHAINED_REFERENCE_READONLY_PREFIX;
    // The full padded prefix is 66 characters long, with 64 hex characters and the 0x prefix.
    const paddedPrefix = `0x${prefix}${'0'.repeat(64 - prefix.length)}`;
    return BigNumber.from(paddedPrefix).add(key);
  }

  static fromChainedReference(ref: string, isTemporary = true): BigNumber {
    const prefix = isTemporary
      ? Relayer.CHAINED_REFERENCE_TEMP_PREFIX
      : Relayer.CHAINED_REFERENCE_READONLY_PREFIX;
    // The full padded prefix is 66 characters long, with 64 hex characters and the 0x prefix.
    const paddedPrefix = `0x${prefix}${'0'.repeat(64 - prefix.length)}`;
    return BigNumber.from(ref).sub(BigNumber.from(paddedPrefix));
  }

  /**
   * Returns true if `amount` is not actually an amount, but rather a chained reference.
   */
  static isChainedReference(amount: string): boolean {
    const amountBn = BigNumber.from(amount);
    const mask = BigNumber.from(
      '0xfff0000000000000000000000000000000000000000000000000000000000000'
    );
    const readonly =
      '0xba10000000000000000000000000000000000000000000000000000000000000';
    const check = amountBn.toBigInt() & mask.toBigInt();
    return readonly === BigNumber.from(check)._hex.toString();
  }

  static formatExitPoolInput(params: ExitPoolData): EncodeExitPoolInput {
    const {
      assets,
      minAmountsOut,
      userData,
      toInternalBalance,
      poolId,
      poolKind,
      sender,
      recipient,
      outputReferences,
    } = params;

    const exitPoolRequest: ExitPoolRequest = {
      assets,
      minAmountsOut,
      userData,
      toInternalBalance,
    };

    const exitPoolInput: EncodeExitPoolInput = {
      poolId,
      poolKind,
      sender,
      recipient,
      outputReferences,
      exitPoolRequest,
    };
    return exitPoolInput;
  }

  static formatJoinPoolInput(params: JoinPoolData): EncodeJoinPoolInput {
    const {
      assets,
      maxAmountsIn,
      userData,
      fromInternalBalance,
      poolId,
      kind,
      sender,
      recipient,
      value,
      outputReference,
    } = params;

    const joinPoolRequest: JoinPoolRequest = {
      assets,
      maxAmountsIn,
      userData,
      fromInternalBalance,
    };

    const joinPoolInput: EncodeJoinPoolInput = {
      poolId,
      kind,
      sender,
      recipient,
      value,
      outputReference,
      joinPoolRequest,
    };

    return joinPoolInput;
  }

  /**
   * fetchPools saves updated pools data to SOR internal onChainBalanceCache.
   * @param {SubgraphPoolBase[]} [poolsData=[]] If poolsData passed uses this as pools source otherwise fetches from config.subgraphUrl.
   * @param {boolean} [isOnChain=true] If isOnChain is true will retrieve all required onChain data via multicall otherwise uses subgraph values.
   * @returns {boolean} Boolean indicating whether pools data was fetched correctly (true) or not (false).
   */
  async fetchPools(): Promise<boolean> {
    return this.swaps.fetchPools();
  }

  public getPools(): SubgraphPoolBase[] {
    return this.swaps.getPools();
  }

  /**
   * exitPoolAndBatchSwap Chains poolExit with batchSwap to final tokens.
   * @param {ExitAndBatchSwapInput} params
   * @param {string} exiter - Address used to exit pool.
   * @param {string} swapRecipient - Address that receives final tokens.
   * @param {string} poolId - Id of pool being exited.
   * @param {string[]} exitTokens - Array containing addresses of tokens to receive after exiting pool. (must have the same length and order as the array returned by `getPoolTokens`.)
   * @param {string} userData - Encoded exitPool data.
   * @param {string[]} expectedAmountsOut - Expected amounts of exitTokens to receive when exiting pool.
   * @param {string[]} finalTokensOut - Array containing the addresses of the final tokens out.
   * @param {string} slippage - Slippage to be applied to swap section. i.e. 5%=50000000000000000.
   * @param {FetchPoolsInput} fetchPools - Set whether SOR will fetch updated pool info.
   * @returns Transaction data with calldata. Outputs.amountsOut has amounts of finalTokensOut returned.
   */
  async exitPoolAndBatchSwap(
    params: ExitAndBatchSwapInput
  ): Promise<TransactionData> {
    const slippageAmountNegative = WeiPerEther.sub(
      BigNumber.from(params.slippage)
    );
    // Set min amounts out of exit pool based on slippage
    const minAmountsOut = params.expectedAmountsOut.map((amt) =>
      BigNumber.from(amt)
        .mul(slippageAmountNegative)
        .div(WeiPerEther)
        .toString()
    );

    // Output of exit is used as input to swaps
    const outputReferences: OutputReference[] = [];
    params.exitTokens.forEach((asset, i) => {
      const key = Relayer.toChainedReference(i);
      outputReferences.push({
        index: i,
        key: key,
      });
    });

    const exitPoolInput = Relayer.formatExitPoolInput({
      assets: params.exitTokens,
      minAmountsOut,
      userData: params.userData,
      toInternalBalance: true, // Creates exitPool request with exit to internal balance to save gas for following swaps
      poolId: params.poolId,
      poolKind: 0, // This will always be 0 to match supported Relayer types
      sender: params.exiter,
      recipient: params.exiter,
      outputReferences: outputReferences,
      exitPoolRequest: {} as ExitPoolRequest,
    });
    const exitCall = Relayer.encodeExitPool(exitPoolInput);

    // Use swapsService to get swap info for exitTokens>finalTokens
    // This will give batchSwap swap paths
    // Amounts out will be worst case amounts
    const queryResult = await this.swaps.queryBatchSwapWithSor({
      tokensIn: params.exitTokens,
      tokensOut: params.finalTokensOut,
      swapType: SwapType.SwapExactIn,
      amounts: minAmountsOut, // Use minAmountsOut as input to swap to account for slippage
      fetchPools: params.fetchPools,
    });

    // This is a safety check to avoid issues when a swap path exists with 0 value
    if (queryResult.returnAmounts.includes('0'))
      throw new BalancerError(BalancerErrorCode.SWAP_ZERO_RETURN_AMOUNT);

    // Update swap amounts with ref outputs from exitPool
    queryResult.swaps.forEach((swap) => {
      const token = queryResult.assets[swap.assetInIndex];
      const index = params.exitTokens.indexOf(token);
      if (index !== -1) swap.amount = outputReferences[index].key.toString();
    });

    // const tempDeltas = ['10096980', '0', '0', '10199896999999482390', '0']; // Useful for debug

    // Replace tokenIn delta for swaps with amount + slippage.
    // This gives tolerance for limit incase amount out of exitPool is larger min,
    const slippageAmountPositive = WeiPerEther.add(params.slippage);
    params.exitTokens.forEach((exitToken, i) => {
      const index = queryResult.assets
        .map((elem) => elem.toLowerCase())
        .indexOf(exitToken.toLowerCase());
      if (index !== -1) {
        queryResult.deltas[index] = BigNumber.from(params.expectedAmountsOut[i])
          .mul(slippageAmountPositive)
          .div(WeiPerEther)
          .toString();
      }
    });

    // Creates limit array.
    // Slippage set to 0. Already accounted for as swap used amounts out of pool with worst case slippage.
    const limits = Swaps.getLimitsForSlippage(
      params.exitTokens, // tokensIn
      params.finalTokensOut, // tokensOut
      SwapType.SwapExactIn,
      queryResult.deltas, // tempDeltas // Useful for debug
      queryResult.assets,
      '0'
    );

    // Creates fund management using internal balance as source of tokens
    const funds: FundManagement = {
      sender: params.exiter,
      recipient: params.swapRecipient,
      fromInternalBalance: true,
      toInternalBalance: false,
    };

    const encodedBatchSwap = Relayer.encodeBatchSwap({
      swapType: SwapType.SwapExactIn,
      swaps: queryResult.swaps,
      assets: queryResult.assets,
      funds: funds,
      limits: limits.map((l) => l.toString()),
      deadline: MaxUint256,
      value: '0',
      outputReferences: [],
    });

    // Return amounts from swap
    const calls = [exitCall, encodedBatchSwap];
    return {
      function: 'multicall',
      params: calls,
      outputs: {
        amountsOut: queryResult.returnAmounts,
      },
    };
  }

  static signRelayerApproval = async (
    relayerAddress: string,
    signerAddress: string,
    signer: JsonRpcSigner,
    vault: Vault
  ): Promise<string> => {
    const approval = vault.interface.encodeFunctionData('setRelayerApproval', [
      signerAddress,
      relayerAddress,
      true,
    ]);

    const signature =
      await RelayerAuthorization.signSetRelayerApprovalAuthorization(
        vault,
        signer,
        relayerAddress,
        approval
      );

    const calldata = RelayerAuthorization.encodeCalldataAuthorization(
      '0x',
      MaxUint256,
      signature
    );

    return calldata;
  };
}
