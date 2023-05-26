import { JsonRpcSigner } from '@ethersproject/providers';
import { BigNumberish, BigNumber } from '@ethersproject/bignumber';
import { MaxUint256 } from '@ethersproject/constants';
import { BatchRelayerLibrary__factory } from '@/contracts';
import { IVault, Vault } from '@/contracts/Vault';
import {
  EncodeBatchSwapInput,
  EncodeExitPoolInput,
  EncodeJoinPoolInput,
  EncodeUnwrapAaveStaticTokenInput,
  EncodeUnwrapInput,
  EncodeUnwrapWstETHInput,
  EncodeWrapAaveDynamicTokenInput,
  ExitPoolData,
  JoinPoolData,
} from './types';
import { ExitPoolRequest, JoinPoolRequest } from '@/types';
import { Swap } from '../swaps/types';
import { RelayerAuthorization } from '@/lib/utils';
import FundManagementStruct = IVault.FundManagementStruct;
import SingleSwapStruct = IVault.SingleSwapStruct;

export * from './types';

const relayerLibrary = BatchRelayerLibrary__factory.createInterface();

export class Relayer {
  static CHAINED_REFERENCE_TEMP_PREFIX = 'ba10'; // Temporary reference: it is deleted after a read.
  static CHAINED_REFERENCE_READONLY_PREFIX = 'ba11'; // Read-only reference: it is not deleted after a read.

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
      params.request as SingleSwapStruct,
      params.funds as FundManagementStruct,
      params.limit,
      params.deadline as BigNumberish,
      params.value as BigNumberish,
      params.outputReference as BigNumberish,
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

  static encodeWrapAaveDynamicToken(
    params: EncodeWrapAaveDynamicTokenInput
  ): string {
    return relayerLibrary.encodeFunctionData('wrapAaveDynamicToken', [
      params.staticToken,
      params.sender,
      params.recipient,
      params.amount,
      params.fromUnderlying,
      params.outputReference,
    ]);
  }

  static encodeUnwrapAaveStaticToken(
    params: EncodeUnwrapAaveStaticTokenInput
  ): string {
    return relayerLibrary.encodeFunctionData('unwrapAaveStaticToken', [
      params.staticToken,
      params.sender,
      params.recipient,
      params.amount,
      params.toUnderlying,
      params.outputReference,
    ]);
  }

  static encodeUnwrapWstETH(params: EncodeUnwrapWstETHInput): string {
    return relayerLibrary.encodeFunctionData('unwrapWstETH', [
      params.sender,
      params.recipient,
      params.amount,
      params.outputReference,
    ]);
  }

  static encodeUnwrap(
    params: EncodeUnwrapInput,
    linearPoolType: string
  ): string {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let unwrapType: any;

    /**
     * Other unwrap types available on BatchRelayerLibrary that does not seem to
     * have a respective Linear pool type in the SDK:
     * - unwrapUnbuttonToken
     * - unwrapWstETH
     */

    switch (linearPoolType) {
      case 'AaveLinear':
        return this.encodeUnwrapAaveStaticToken({
          staticToken: params.wrappedToken,
          sender: params.sender,
          recipient: params.recipient,
          amount: params.amount,
          toUnderlying: true,
          outputReference: params.outputReference,
        });
      case 'BeefyLinear':
      case 'ERC4626Linear':
        unwrapType = 'unwrapERC4626';
        break;
      case 'EulerLinear':
        unwrapType = 'unwrapEuler';
        break;
      case 'GearboxLinear':
        unwrapType = 'unwrapGearbox';
        break;
      case 'ReaperLinear':
        unwrapType = 'unwrapReaperVaultToken';
        break;
      case 'TetuLinear':
        unwrapType = 'unwrapTetu';
        break;
      case 'YearnLinear':
        unwrapType = 'unwrapYearn';
        break;
      case 'MidasLinear':
        unwrapType = 'unwrapCompoundV2';
        break;
      case 'SiloLinear':
        unwrapType = 'unwrapShareToken';
        break;
      default:
        throw new Error(
          'Unwrapping not supported for this pool type: ' + linearPoolType
        );
    }

    return relayerLibrary.encodeFunctionData(unwrapType, [
      params.wrappedToken,
      params.sender,
      params.recipient,
      params.amount,
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
