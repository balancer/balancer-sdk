import { StablePoolEncoder } from '@/pool-stable/encoder';
import { ADDRESSES } from './addresses';
import { Relayer } from '@/modules/relayer/relayer.module';
import { ExitPoolRequest } from '@/types';
import { BatchSwapStep, FundManagement, SwapType } from '@/modules/swaps/types';
import { Interface } from '@ethersproject/abi';
import { BigNumber } from '@ethersproject/bignumber';
import { MaxInt256 } from '@ethersproject/constants';
import { BalancerError, BalancerErrorCode } from '@/balancerErrors';
// TODO - Ask Nico to update Typechain?
import balancerRelayerAbi from '@/lib/abi/BalancerRelayer.json';
const balancerRelayerInterface = new Interface(balancerRelayerAbi);

const EXIT_MIMATIC = Relayer.toChainedReference('20');
const EXIT_DAI = Relayer.toChainedReference('21');
const EXIT_USDC = Relayer.toChainedReference('22');
const EXIT_USDT = Relayer.toChainedReference('23');
const SWAP_RESULT = Relayer.toChainedReference('24');

export class MaiusdBuilder {
  private addresses;

  constructor(networkId: 1 | 5 | 137) {
    this.addresses = ADDRESSES[networkId];
  }

  /**
   * Builds migration call data.
   * Migrates tokens from maiusd to maibbausd pool.
   * Tokens that are initially staked are re-staked at the end of migration. Non-staked are not.
   *
   * @param userAddress User address.
   * @param bptIn Amount of BPT tokens to migrate.
   * @param minBptOut Minimum of expected BPT out ot the migration flow.
   * @param staked Indicates whether tokens are initially staked or not.
   * @param authorisation Encoded authorisation call.
   * @returns Migration transaction request ready to send with signer.sendTransaction
   */
  calldata(
    userAddress: string,
    bptIn: string,
    minBptOut: string,
    staked: boolean,
    authorisation?: string
  ): {
    to: string;
    data: string;
  } {
    if (BigNumber.from(bptIn).lte(0))
      throw new BalancerError(BalancerErrorCode.INPUT_ZERO_NOT_ALLOWED);

    const relayer = this.addresses.relayer;
    let calls: string[] = [];

    if (authorisation) {
      calls = [this.buildSetRelayerApproval(authorisation)];
    }

    if (staked) {
      calls = [
        ...calls,
        this.buildWithdraw(userAddress, bptIn),
        this.buildExit(relayer, bptIn),
        this.buildSwap(relayer, minBptOut),
        this.buildDeposit(userAddress),
      ];
    } else {
      calls = [
        ...calls,
        this.buildExit(userAddress, bptIn),
        this.buildSwap(userAddress, minBptOut),
      ];
    }

    const callData = balancerRelayerInterface.encodeFunctionData('multicall', [
      calls,
    ]);

    return {
      to: relayer,
      data: callData,
    };
  }

  /**
   * Encodes exitPool callData.
   * Exit maiusd pool proportionally to underlying stables. Exits to relayer.
   * Outputreferences are used to store exit amounts for next transaction.
   *
   * @param sender Sender address.
   * @param amount Amount of BPT to exit with.
   * @returns Encoded exitPool call. Output references.
   */
  buildExit(sender: string, amount: string): string {
    const { assetOrder } = this.addresses.maiusd;
    const assets = assetOrder.map(
      (key) => this.addresses[key as keyof typeof this.addresses] as string
    );

    // Assume gaugeWithdraw returns same amount value
    const userData = StablePoolEncoder.exitExactBPTInForTokensOut(amount);

    // Store exit outputs to be used as swaps inputs
    const outputReferences = [
      { index: assetOrder.indexOf('miMATIC'), key: EXIT_MIMATIC },
      { index: assetOrder.indexOf('DAI'), key: EXIT_DAI },
      { index: assetOrder.indexOf('USDC'), key: EXIT_USDC },
      { index: assetOrder.indexOf('USDT'), key: EXIT_USDT },
    ];

    const minAmountsOut = Array<string>(assets.length).fill('0');

    const callData = Relayer.constructExitCall({
      assets,
      minAmountsOut,
      userData,
      toInternalBalance: true,
      poolId: this.addresses.maiusd.id,
      poolKind: 0, // This will always be 0 to match supported Relayer types
      sender,
      recipient: this.addresses.relayer,
      outputReferences,
      exitPoolRequest: {} as ExitPoolRequest,
    });

    return callData;
  }

  /**
   * Creates encoded batchSwap function with following swaps: stables -> linear pools -> boosted pool
   * outputreferences should contain the amount of resulting BPT.
   *
   * @param recipient Sender address.
   * @param minBptOut Minimum BPT out expected from the join transaction.
   * @returns Encoded batchSwap call. Output references.
   */
  buildSwap(recipient: string, minBptOut: string): string {
    const assets = [
      this.addresses.bbausd2.address,
      this.addresses.DAI,
      this.addresses.linearDai2.address,
      this.addresses.USDC,
      this.addresses.linearUsdc2.address,
      this.addresses.USDT,
      this.addresses.linearUsdt2.address,
      this.addresses.miMATIC,
      this.addresses.maibbausd.address,
    ];

    const outputReferences = [{ index: 8, key: SWAP_RESULT }];

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
        poolId: this.addresses.maibbausd.id,
        assetInIndex: 0,
        assetOutIndex: 8,
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
        poolId: this.addresses.maibbausd.id,
        assetInIndex: 0,
        assetOutIndex: 8,
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
      {
        poolId: this.addresses.maibbausd.id,
        assetInIndex: 0,
        assetOutIndex: 8,
        amount: '0',
        userData: '0x',
      },
      {
        poolId: this.addresses.maibbausd.id,
        assetInIndex: 7,
        assetOutIndex: 8,
        amount: EXIT_MIMATIC.toString(),
        userData: '0x',
      },
    ];

    // For tokens going in to the Vault, the limit shall be a positive number. For tokens going out of the Vault, the limit shall be a negative number.
    const limits = [
      '0',
      MaxInt256.toString(),
      '0',
      MaxInt256.toString(),
      '0',
      MaxInt256.toString(),
      '0',
      MaxInt256.toString(),
      BigNumber.from(minBptOut).mul(-1).toString(),
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
      deadline: BigNumber.from(Math.ceil(Date.now() / 1000) + 3600), // 1 hour from now
      value: '0',
      outputReferences,
    });

    return encodedBatchSwap;
  }

  /**
   * Uses relayer to withdraw staked BPT from gauge and send to relayer
   *
   * @param sender Sender address.
   * @param amount Amount of BPT to exit with.
   * @returns withdraw call
   */
  buildWithdraw(sender: string, amount: string): string {
    return Relayer.encodeGaugeWithdraw(
      this.addresses.maiusd.gauge,
      sender,
      this.addresses.relayer,
      amount
    );
  }

  /**
   * Uses relayer to deposit user's BPT to gauge and sends to recipient
   *
   * @param recipient Recipient address.
   * @returns deposit call
   */
  buildDeposit(recipient: string): string {
    return Relayer.encodeGaugeDeposit(
      this.addresses.maibbausd.gauge,
      this.addresses.relayer,
      recipient,
      SWAP_RESULT.toString()
    );
  }

  /**
   * Uses relayer to approve itself to act in behalf of the user
   *
   * @param authorisation Encoded authorisation call.
   * @returns relayer approval call
   */
  buildSetRelayerApproval(authorisation: string): string {
    return Relayer.encodeSetRelayerApproval(
      this.addresses.relayer,
      true,
      authorisation
    );
  }
}
