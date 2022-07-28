import { StablePoolEncoder } from '@/pool-stable/encoder';
import { ADDRESSES } from './addresses';
import { Relayer } from '@/modules/relayer/relayer.module';
import { ExitPoolRequest } from '@/types';
import { BatchSwapStep, FundManagement, SwapType } from '@/modules/swaps/types';
import { Interface } from '@ethersproject/abi';
import { BigNumber } from '@ethersproject/bignumber';
import { MaxUint256, MaxInt256 } from '@ethersproject/constants';
// TODO - Ask Nico to update Typechain?
import balancerRelayerAbi from '@/lib/abi/BalancerRelayer.json';
const balancerRelayerInterface = new Interface(balancerRelayerAbi);

const EXIT_DAI = Relayer.toChainedReference('21');
const EXIT_USDC = Relayer.toChainedReference('22');
const EXIT_USDT = Relayer.toChainedReference('23');
const SWAP_RESULT_BBAUSD = Relayer.toChainedReference('24');

export class StaBal3Builder {
  private addresses;

  constructor(networkId: 1 | 5) {
    this.addresses = ADDRESSES[networkId];
  }

  calldata(
    staBal3Amount: string,
    minBbausd2Out: string,
    userAddress: string,
    staked: boolean,
    authorisation: string
  ): {
    to: string;
    data: string;
  } {
    const relayer = this.addresses.relayer;
    let calls: string[] = [];

    if (staked) {
      calls = [
        this.buildSetRelayerApproval(authorisation),
        this.buildWithdraw(userAddress, staBal3Amount),
        this.buildExit(relayer, relayer, staBal3Amount),
        this.buildSwap(minBbausd2Out, relayer),
        this.buildDeposit(userAddress),
      ];
    } else {
      calls = [
        this.buildSetRelayerApproval(authorisation),
        this.buildExit(userAddress, relayer, staBal3Amount),
        this.buildSwap(minBbausd2Out, userAddress),
      ];
    }

    // TODO: Let's double check with setting approveVault to 0 if we need that or not, or ask Nico ;)
    // const { assetOrder } = this.addresses.staBal3;
    // ...assetOrder.map((name) => {
    //   const tokenAddress = this.addresses[
    //     name as keyof typeof this.addresses
    //   ] as string;
    //   return this.buildApproveVault(tokenAddress);
    // }),

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
  buildExit(sender: string, recipient: string, amount: string): string {
    // Goerli and Mainnet has different assets ordering
    const { assetOrder } = this.addresses.staBal3;
    const assets = assetOrder.map(
      (key) => this.addresses[key as keyof typeof this.addresses] as string
    );

    // Assume gaugeWithdraw returns same amount value
    const userData = StablePoolEncoder.exitExactBPTInForTokensOut(amount);
    // const userData = StablePoolEncoder.exitExactBPTInForOneTokenOut(
    //   amount,
    //   assetOrder.indexOf('DAI')
    // );

    // Ask to store exit outputs for batchSwap of exit is used as input to swaps
    const outputReferences = [
      { index: assetOrder.indexOf('DAI'), key: EXIT_DAI },
      { index: assetOrder.indexOf('USDC'), key: EXIT_USDC },
      { index: assetOrder.indexOf('USDT'), key: EXIT_USDT },
    ];

    const callData = Relayer.constructExitCall({
      assets,
      minAmountsOut: ['0', '0', '0'],
      userData,
      toInternalBalance: true,
      poolId: this.addresses.staBal3.id,
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
  buildSwap(expectedBptReturn: string, recipient: string): string {
    const assets = [
      this.addresses.bbausd2.address,
      this.addresses.DAI,
      this.addresses.linearDai2.address,
      this.addresses.USDC,
      this.addresses.linearUsdc2.address,
      this.addresses.USDT,
      this.addresses.linearUsdt2.address,
    ];

    const outputReferences = [{ index: 0, key: SWAP_RESULT_BBAUSD }];

    // for each linear pool swap -
    // linear1Bpt[linear1]stable[linear2]linear2bpt[bbausd2]bbausd2 Uses chainedReference from previous action for amount.
    // TO DO - Will swap order matter here? John to ask Fernando.
    const swaps: BatchSwapStep[] = [
      {
        poolId: this.addresses.linearDai2.id,
        assetInIndex: 1,
        assetOutIndex: 2,
        amount: EXIT_DAI.toString(),
        userData: '0x',
      },
      {
        poolId: this.addresses.bbausd2.id,
        assetInIndex: 2,
        assetOutIndex: 0,
        amount: '0',
        userData: '0x',
      },
      {
        poolId: this.addresses.linearUsdc2.id,
        assetInIndex: 3,
        assetOutIndex: 4,
        amount: EXIT_USDC.toString(),
        userData: '0x',
      },
      {
        poolId: this.addresses.bbausd2.id,
        assetInIndex: 4,
        assetOutIndex: 0,
        amount: '0',
        userData: '0x',
      },
      {
        poolId: this.addresses.linearUsdt2.id,
        assetInIndex: 5,
        assetOutIndex: 6,
        amount: EXIT_USDT.toString(),
        userData: '0x',
      },
      {
        poolId: this.addresses.bbausd2.id,
        assetInIndex: 6,
        assetOutIndex: 0,
        amount: '0',
        userData: '0x',
      },
    ];

    // For tokens going in to the Vault, the limit shall be a positive number. For tokens going out of the Vault, the limit shall be a negative number.
    console.log(`Min: `, BigNumber.from(expectedBptReturn).mul(-1).toString());
    const limits = [
      BigNumber.from(expectedBptReturn).mul(-1).toString(),
      MaxInt256.toString(),
      '0',
      MaxInt256.toString(),
      '0',
      MaxInt256.toString(),
      '0',
    ];

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
  buildWithdraw(sender: string, amount: string): string {
    return Relayer.encodeGaugeWithdraw(
      this.addresses.staBal3.gauge,
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
  buildDeposit(recipient: string): string {
    return Relayer.encodeGaugeDeposit(
      this.addresses.bbausd2.gauge,
      this.addresses.relayer,
      recipient,
      SWAP_RESULT_BBAUSD.toString()
    );
  }

  buildApproveVault(token: string): string {
    return Relayer.encodeApproveVault(token, MaxUint256.toString());
  }

  buildSetRelayerApproval(authorisation: string): string {
    return Relayer.encodeSetRelayerApproval(
      this.addresses.relayer,
      true,
      authorisation
    );
  }
}
