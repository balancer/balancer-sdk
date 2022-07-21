import { StablePoolEncoder } from '@/pool-stable/encoder';
import { ADDRESSES } from './addresses';
import { Relayer } from '@/modules/relayer/relayer.module';
import { ExitPoolRequest } from '@/types';
import { BatchSwapStep, FundManagement, SwapType } from '@/modules/swaps/types';
import { Interface } from '@ethersproject/abi';
import { MaxUint256 } from '@ethersproject/constants';
// TO DO - Ask Nico to update Typechain?
import balancerRelayerAbi from '@/lib/abi/BalancerRelayer.json';
const balancerRelayerInterface = new Interface(balancerRelayerAbi);

const EXIT_DAI = Relayer.toChainedReference('exit_dai');
const EXIT_USDC = Relayer.toChainedReference('exit_usdc');
const EXIT_USDT = Relayer.toChainedReference('exit_usdt');
const SWAP_RESULT_BBAUSD = Relayer.toChainedReference('swap_result_bbausd');

export class StaBal3Builder {
  private addresses;

  constructor(networkId: 1 | 5) {
    this.addresses = ADDRESSES[networkId];
  }

  calldata(
    amount: string,
    expectedAmount: string,
    userAddress: string,
    staked: boolean
  ): {
    to: string;
    data: string;
  } {
    let calls = [
      this.buildExit(userAddress, amount),
      this.buildSwap(expectedAmount),
    ];

    if (staked) {
      calls = [
        this.buildWithdraw(userAddress, amount),
        ...calls,
        this.buildDeposit(userAddress),
      ];
    }

    const callData = balancerRelayerInterface.encodeFunctionData(
      'multicall',
      calls
    );

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
  buildExit(migrator: string, amount: string): string {
    // Assume gaugeWithdraw returns same amount value
    const userData = StablePoolEncoder.exitExactBPTInForTokensOut(amount);

    // TO DO - Tokens have to be in correct order - might not be.
    // UPDATE: checked PoolBalanceChanged events after exit in etherscan, order checks out for all the transactions
    const assets = [
      this.addresses.DAI,
      this.addresses.USDC,
      this.addresses.USDT,
    ];

    // Ask to store exit outputs for batchSwap of exit is used as input to swaps
    const outputReferences = [
      { index: 0, key: EXIT_DAI },
      { index: 1, key: EXIT_USDC },
      { index: 2, key: EXIT_USDT },
    ];

    const callData = Relayer.constructExitCall({
      assets,
      minAmountsOut: ['0', '0', '0'],
      userData,
      toInternalBalance: true,
      poolId: this.addresses.staBal3.id,
      poolKind: 0, // This will always be 0 to match supported Relayer types
      sender: migrator,
      recipient: this.addresses.relayer,
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
  buildSwap(expectedBptReturn: string): string {
    const assets = [
      this.addresses.DAI,
      this.addresses.linearDai2.address,
      this.addresses.USDC,
      this.addresses.linearUsdc2.address,
      this.addresses.USDT,
      this.addresses.linearUsdt2.address,
      this.addresses.bbausd2.address,
    ];

    const outputReferences = [{ index: 6, key: SWAP_RESULT_BBAUSD }];

    // for each linear pool swap -
    // linear1Bpt[linear1]stable[linear2]linear2bpt[bbausd2]bbausd2 Uses chainedReference from previous action for amount.
    // TO DO - Will swap order matter here? John to ask Fernando.
    const swaps: BatchSwapStep[] = [
      {
        poolId: this.addresses.linearDai2.id,
        assetInIndex: 0,
        assetOutIndex: 1,
        amount: EXIT_DAI.toString(),
        userData: '0x',
      },
      {
        poolId: this.addresses.bbausd2.id,
        assetInIndex: 1,
        assetOutIndex: 6,
        amount: '0',
        userData: '0x',
      },
      {
        poolId: this.addresses.linearUsdc2.id,
        assetInIndex: 2,
        assetOutIndex: 3,
        amount: EXIT_USDC.toString(),
        userData: '0x',
      },
      {
        poolId: this.addresses.bbausd2.id,
        assetInIndex: 3,
        assetOutIndex: 6,
        amount: '0',
        userData: '0x',
      },
      {
        poolId: this.addresses.linearUsdt2.id,
        assetInIndex: 4,
        assetOutIndex: 5,
        amount: EXIT_USDT.toString(),
        userData: '0x',
      },
      {
        poolId: this.addresses.bbausd2.id,
        assetInIndex: 5,
        assetOutIndex: 6,
        amount: '0',
        userData: '0x',
      },
    ];

    // For now assuming ref amounts will be safe - should we add more accurate?
    const limits = ['0', '0', '0', '0', '0', '0', expectedBptReturn.toString()];

    // Swap to/from Relayer
    const funds: FundManagement = {
      sender: this.addresses.relayer,
      recipient: this.addresses.relayer,
      fromInternalBalance: true,
      toInternalBalance: true,
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
  buildWithdraw(migrator: string, amount: string): string {
    return Relayer.encodeGaugeWithdraw(
      this.addresses.staBal3.gauge,
      migrator,
      this.addresses.relayer,
      amount
    );
  }

  /**
   * Is using gauge relayer to deposit user's BPT to itself
   *
   * @returns deposit call
   */
  buildDeposit(migrator: string): string {
    return Relayer.encodeGaugeDeposit(
      this.addresses.bbausd2.gauge,
      this.addresses.relayer,
      migrator,
      SWAP_RESULT_BBAUSD.toString()
    );
  }
}
