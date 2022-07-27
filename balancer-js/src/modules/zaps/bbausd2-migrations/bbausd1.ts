import { ADDRESSES } from './addresses';
import { Relayer } from '@/modules/relayer/relayer.module';
import { BatchSwapStep, FundManagement, SwapType } from '@/modules/swaps/types';
import { Interface } from '@ethersproject/abi';
import { MaxUint256, MaxInt256, Zero } from '@ethersproject/constants';
// TODO - Ask Nico to update Typechain?
import balancerRelayerAbi from '@/lib/abi/BalancerRelayer.json';
import { PoolToken } from '@/types';
import { BigNumber, parseFixed } from '@ethersproject/bignumber';
const balancerRelayerInterface = new Interface(balancerRelayerAbi);

const SWAP_RESULT_BBAUSD = Relayer.toChainedReference('24');

export class BbaUsd1Builder {
  private addresses;

  constructor(networkId: 1 | 5) {
    this.addresses = ADDRESSES[networkId];
  }

  calldata(
    amount: string,
    expectedAmount = MaxInt256.toString(),
    userAddress: string,
    staked: boolean,
    authorisation: string,
    tokens: PoolToken[]
  ): {
    to: string;
    data: string;
  } {
    const relayer = this.addresses.relayer;
    let calls: string[] = [];

    if (staked) {
      calls = [
        this.buildSetRelayerApproval(authorisation),
        this.buildWithdraw(userAddress, amount),
        this.buildSwap(amount, expectedAmount, relayer, relayer, tokens),
        this.buildDeposit(userAddress),
      ];
    } else {
      calls = [
        this.buildSetRelayerApproval(authorisation),
        this.buildSwap(
          amount,
          expectedAmount,
          userAddress,
          userAddress,
          tokens
        ),
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
   * Creates encoded batchSwap function to swap Linear BPTs to underlying stables.
   * outputreferences should contain the amounts of each new Linear BPT.
   *
   * @returns BatchSwap call.
   */
  buildSwap(
    bptAmount: string,
    expectedBptReturn: string,
    sender: string,
    recipient: string,
    tokens: PoolToken[]
  ): string {
    const assets = [
      this.addresses.bbausd2.address,
      this.addresses.waDAI,
      this.addresses.linearDai1.address,
      this.addresses.linearDai2.address,
      this.addresses.waUSDC,
      this.addresses.linearUsdc1.address,
      this.addresses.linearUsdc2.address,
      this.addresses.waUSDT,
      this.addresses.linearUsdt1.address,
      this.addresses.linearUsdt2.address,
      this.addresses.bbausd1.address,
    ];

    const outputReferences = [{ index: 0, key: SWAP_RESULT_BBAUSD }];

    // Calculate proportional token amounts

    // Assuming 1:1 exchange rates between tokens
    // TODO: Fetch current prices, or use price or priceRate from subgraph?
    const totalLiquidity = tokens.reduce(
      (sum, token) => sum.add(parseFixed(token.balance, 18)),
      Zero
    );

    const balances = Object.fromEntries(
      tokens.map((token) => [
        token.symbol,
        parseFixed(token.balance, 18).toString(),
      ])
    );

    // bbausd1[bbausd1]blinear1[linear1]stable[linear2]blinear2[bbausd2]bbausd2 and then do that proportionally for each underlying stable.
    // TO DO - Will swap order matter here? John to ask Fernando.

    // Split BPT amount proportionally:
    const usdcBptAmt = BigNumber.from(bptAmount)
      .mul(balances['bb-a-USDC'])
      .div(totalLiquidity)
      .toString();
    const usdtBptAmt = BigNumber.from(bptAmount)
      .mul(balances['bb-a-USDT'])
      .div(totalLiquidity)
      .toString();
    const daiBptAmt = BigNumber.from(bptAmount)
      .sub(BigNumber.from(usdcBptAmt))
      .sub(BigNumber.from(usdtBptAmt))
      .toString();

    const swaps: BatchSwapStep[] = [
      {
        poolId: this.addresses.bbausd1.id,
        assetInIndex: 10,
        assetOutIndex: 2,
        amount: daiBptAmt,
        userData: '0x',
      },
      {
        poolId: this.addresses.linearDai1.id,
        assetInIndex: 2,
        assetOutIndex: 1,
        amount: '0',
        userData: '0x',
      },
      {
        poolId: this.addresses.linearDai2.id,
        assetInIndex: 1,
        assetOutIndex: 3,
        amount: '0',
        userData: '0x',
      },
      {
        poolId: this.addresses.bbausd2.id,
        assetInIndex: 3,
        assetOutIndex: 0,
        amount: '0',
        userData: '0x',
      },
      {
        poolId: this.addresses.bbausd1.id,
        assetInIndex: 10,
        assetOutIndex: 5,
        amount: usdcBptAmt,
        userData: '0x',
      },
      {
        poolId: this.addresses.linearUsdc1.id,
        assetInIndex: 5,
        assetOutIndex: 4,
        amount: '0',
        userData: '0x',
      },
      {
        poolId: this.addresses.linearUsdc2.id,
        assetInIndex: 4,
        assetOutIndex: 6,
        amount: '0',
        userData: '0x',
      },
      {
        poolId: this.addresses.bbausd2.id,
        assetInIndex: 6,
        assetOutIndex: 0,
        amount: '0',
        userData: '0x',
      },
      {
        poolId: this.addresses.bbausd1.id,
        assetInIndex: 10,
        assetOutIndex: 8,
        amount: usdtBptAmt,
        userData: '0x',
      },
      {
        poolId: this.addresses.linearUsdt1.id,
        assetInIndex: 8,
        assetOutIndex: 7,
        amount: '0',
        userData: '0x',
      },
      {
        poolId: this.addresses.linearUsdt2.id,
        assetInIndex: 7,
        assetOutIndex: 9,
        amount: '0',
        userData: '0x',
      },
      {
        poolId: this.addresses.bbausd2.id,
        assetInIndex: 9,
        assetOutIndex: 0,
        amount: '0',
        userData: '0x',
      },
    ];

    // For now assuming ref amounts will be safe - should we add more accurate?
    const limits = [
      expectedBptReturn,
      MaxInt256.toString(),
      MaxInt256.toString(),
      MaxInt256.toString(),
      MaxInt256.toString(),
      MaxInt256.toString(),
      MaxInt256.toString(),
      MaxInt256.toString(),
      MaxInt256.toString(),
      MaxInt256.toString(),
      MaxInt256.toString(),
    ];

    // Swap to/from Relayer
    const funds: FundManagement = {
      sender,
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
      this.addresses.bbausd1.gauge,
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
