import { StablePoolEncoder } from '@/pool-stable/encoder';
import { ADDRESSES } from './addresses';
import { Relayer } from '@/modules/relayer/relayer.module';
import { ExitPoolRequest } from '@/types';
import { BatchSwapStep, FundManagement, SwapType } from '@/modules/swaps/types';
import { Interface } from '@ethersproject/abi';
import { MaxUint256, MaxInt256 } from '@ethersproject/constants';
// TODO - Ask Nico to update Typechain?
import balancerRelayerAbi from '@/lib/abi/BalancerRelayer.json';
import { BigNumber } from 'ethers';
const balancerRelayerInterface = new Interface(balancerRelayerAbi);

const SWAP_RESULT = Relayer.toChainedReference('0');
const EXIT_RESULTS: BigNumber[] = [];

export class StablesBuilder {
  private addresses;

  constructor(networkId: 1 | 5) {
    this.addresses = ADDRESSES[networkId];
  }

  calldata(
    from: { id: string; address: string; gauge?: string },
    to: { id: string; address: string; gauge?: string },
    userAddress: string,
    amount: string,
    expectedAmount = MaxInt256.toString(),
    authorisation: string,
    staked: boolean,
    tokens: string[]
  ): {
    to: string;
    data: string;
  } {
    const relayer = this.addresses.relayer;
    let calls: string[] = [];
    if (staked && (from.gauge == undefined || to.gauge == undefined))
      throw new Error(
        'Staked flow migration requires gauge addresses to be provided'
      );

    if (staked) {
      calls = [
        this.buildSetRelayerApproval(authorisation),
        this.buildWithdraw(userAddress, amount, from.gauge as string),
        this.buildExit(from.id, relayer, relayer, amount, tokens),
        this.buildSwap(expectedAmount, relayer, to.id, to.address, tokens),
        this.buildDeposit(userAddress, to.gauge as string),
      ];
    } else {
      calls = [
        this.buildSetRelayerApproval(authorisation),
        this.buildExit(from.id, userAddress, relayer, amount, tokens),
        this.buildSwap(expectedAmount, userAddress, to.id, to.address, tokens),
      ];
    }

    const callData = balancerRelayerInterface.encodeFunctionData('multicall', [
      calls,
    ]);

    return {
      to: this.addresses.relayer,
      data: callData,
    };
  }

  /**
   * Encodes exitPool callData.
   * Exit staBal3 pool proportionally to underlying Linear BPTs. Exits to relayer.
   * Outputreferences are used to store exit amounts for next transaction.
   *
   * @param migrator Migrator address.
   * @param amount Amount of staBal3 BPT to exit with.
   * @returns Encoded exitPool call. Output references.
   */
  buildExit(
    poolId: string,
    sender: string,
    recipient: string,
    amount: string,
    tokens: string[]
  ): string {
    // Assume gaugeWithdraw returns same amount value
    const userData = StablePoolEncoder.exitExactBPTInForTokensOut(amount);

    // Ask to store exit outputs for batchSwap of exit is used as input to swaps
    // TODO: check how does tokens order matter between exits and swaps
    const outputReferences = [];
    for (let i = 0; i < tokens.length; i++) {
      outputReferences[i] = {
        index: i,
        key: Relayer.toChainedReference(`${i + 1}`), // index 0 will be used by swap result
      };
      EXIT_RESULTS.push(outputReferences[i].key);
    }

    const callData = Relayer.constructExitCall({
      assets: tokens,
      minAmountsOut: ['0', '0', '0'],
      userData,
      toInternalBalance: true,
      poolId,
      poolKind: 0, // This will always be 0 to match supported Relayer types
      sender,
      recipient,
      outputReferences,
      exitPoolRequest: {} as ExitPoolRequest,
    });

    return callData;
  }

  /**
   * Creates encoded batchSwap function to swap Linear BPTs to underlying stables.
   * outputreferences should contain the amounts of each new Linear BPT.
   *
   * @returns BatchSwap call.
   */
  buildSwap(
    expectedBptReturn: string,
    recipient: string,
    poolId: string,
    poolAddress: string,
    tokens: string[]
  ): string {
    const assets = [poolAddress, ...tokens];

    const outputReferences = [{ index: 0, key: SWAP_RESULT }];

    const swaps: BatchSwapStep[] = [];
    // Add a swap flow for each token provided
    for (let i = 0; i < tokens.length; i++) {
      swaps.push({
        poolId,
        assetInIndex: i + 1,
        assetOutIndex: 0,
        amount: EXIT_RESULTS[i].toString(),
        userData: '0x',
      });
    }

    // For now assuming ref amounts will be safe - should we add more accurate?
    const limits = [expectedBptReturn];
    for (let i = 0; i < tokens.length; i++) {
      limits.push(MaxInt256.toString());
    }

    // Swap to/from Relayer
    const funds: FundManagement = {
      sender: this.addresses.relayer,
      recipient,
      fromInternalBalance: true,
      toInternalBalance: false,
    };

    const encodedBatchSwap = Relayer.encodeBatchSwap({
      swapType: SwapType.SwapExactIn,
      swaps,
      assets,
      funds,
      limits,
      deadline: MaxUint256,
      value: '0',
      outputReferences,
    });

    return encodedBatchSwap;
  }

  /**
   * Is using gauge relayer to withdraw staked BPT from user to itself
   *
   * @returns withdraw call
   */
  buildWithdraw(sender: string, amount: string, address: string): string {
    return Relayer.encodeGaugeWithdraw(
      address,
      sender,
      this.addresses.relayer,
      amount
    );
  }

  /**
   * Is using gauge relayer to deposit user's BPT to itself
   *
   * @returns deposit call
   */
  buildDeposit(recipient: string, address: string): string {
    return Relayer.encodeGaugeDeposit(
      address,
      this.addresses.relayer,
      recipient,
      SWAP_RESULT.toString()
    );
  }

  buildSetRelayerApproval(authorisation: string): string {
    return Relayer.encodeSetRelayerApproval(
      this.addresses.relayer,
      true,
      authorisation
    );
  }
}
