import { StablePoolEncoder } from '@/pool-stable/encoder';
import { ADDRESSES } from './addresses';
import { Relayer } from '@/modules/relayer/relayer.module';
import { ExitPoolRequest } from '@/types';
import { BatchSwapStep, FundManagement, SwapType } from '@/modules/swaps/types';
import { Interface } from '@ethersproject/abi';
import { BigNumber } from '@ethersproject/bignumber';
import { MaxInt256 } from '@ethersproject/constants';
// TODO - Ask Nico to update Typechain?
import balancerRelayerAbi from '@/lib/abi/BalancerRelayer.json';
const balancerRelayerInterface = new Interface(balancerRelayerAbi);

const SWAP_RESULT = Relayer.toChainedReference('0');
const EXIT_RESULTS: BigNumber[] = [];

export class StablesBuilder {
  private addresses;

  constructor(networkId: 1 | 5 | 137) {
    this.addresses = ADDRESSES[networkId];
  }

  /**
   * Builds migration call data.
   * Migrates tokens from old stable to new stable phantom pools with the same underlying tokens.
   * Tokens that are initially staked are re-staked at the end of migration. Non-staked are not.
   *
   * @param userAddress User address.
   * @param from Pool info being migrated from
   * @param to Pool info being migrated to
   * @param bptIn Amount of BPT tokens to migrate.
   * @param minBptOut Minimum of expected BPT out ot the migration flow.
   * @param staked Indicates whether tokens are initially staked or not.
   * @param underlyingTokens Underlying token addresses. Array must have the same length and order as underlying tokens in pool being migrated from. Refer to [getPoolTokens](https://github.com/balancer-labs/balancer-v2-monorepo/blob/master/pkg/interfaces/contracts/vault/IVault.sol#L334).
   * @param authorisation Encoded authorisation call.
   * @returns Migration transaction request ready to send with signer.sendTransaction
   */
  calldata(
    userAddress: string,
    from: { id: string; address: string; gauge?: string },
    to: { id: string; address: string; gauge?: string },
    bptIn: string,
    minBptOut: string,
    staked: boolean,
    underlyingTokens: string[],
    authorisation?: string
  ): {
    to: string;
    data: string;
  } {
    if (staked && (from.gauge == undefined || to.gauge == undefined))
      throw new Error(
        'Staked flow migration requires gauge addresses to be provided'
      );

    const relayer = this.addresses.relayer;
    let calls: string[] = [];

    if (authorisation) {
      calls = [this.buildSetRelayerApproval(authorisation)];
    }

    if (staked) {
      calls = [
        ...calls,
        this.buildWithdraw(userAddress, bptIn, from.gauge as string),
        this.buildExit(from.id, relayer, bptIn, underlyingTokens),
        this.buildSwap(minBptOut, relayer, to.id, to.address, underlyingTokens),
        this.buildDeposit(userAddress, to.gauge as string),
      ];
    } else {
      calls = [
        ...calls,
        this.buildExit(from.id, userAddress, bptIn, underlyingTokens),
        this.buildSwap(
          minBptOut,
          userAddress,
          to.id,
          to.address,
          underlyingTokens
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
   * Encodes exitPool call data.
   * Exit stable pool proportionally to underlying stables. Exits to relayer.
   * Outputreferences are used to store exit amounts for next transaction.
   *
   * @param poolId Pool id.
   * @param sender Sender address.
   * @param amount Amount of BPT to exit with.
   * @param underlyingTokens Token addresses to exit to.
   * @returns Encoded exitPool call. Output references.
   */
  buildExit(
    poolId: string,
    sender: string,
    amount: string,
    underlyingTokens: string[]
  ): string {
    // Assume gaugeWithdraw returns same amount value
    const userData = StablePoolEncoder.exitExactBPTInForTokensOut(amount);

    // Store exit outputs to be used as swaps inputs
    const outputReferences = [];
    for (let i = 0; i < underlyingTokens.length; i++) {
      outputReferences[i] = {
        index: i,
        key: Relayer.toChainedReference(`${i + 1}`), // index 0 will be used by swap result
      };
      EXIT_RESULTS.push(outputReferences[i].key);
    }

    const minAmountsOut = Array<string>(underlyingTokens.length).fill('0');

    const callData = Relayer.constructExitCall({
      assets: underlyingTokens,
      minAmountsOut,
      userData,
      toInternalBalance: true,
      poolId,
      poolKind: 0, // This will always be 0 to match supported Relayer types
      sender,
      recipient: this.addresses.relayer,
      outputReferences,
      exitPoolRequest: {} as ExitPoolRequest,
    });

    return callData;
  }

  /**
   * Creates encoded batchSwap function to swap stables to new phantom stable pool BPT.
   * outputreferences should contain the amount of resulting BPT.
   *
   * @param expectedBptReturn BPT amount expected out of the swap.
   * @param recipient Recipient address.
   * @param poolId Pool id
   * @param poolAddress Pool address
   * @param tokens Token addresses to swap from.
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

    // For tokens going in to the Vault, the limit shall be a positive number. For tokens going out of the Vault, the limit shall be a negative number.
    const limits = [BigNumber.from(expectedBptReturn).mul(-1).toString()];
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
   * @param gaugeAddress Gauge address.
   * @returns withdraw call
   */
  buildWithdraw(sender: string, amount: string, gaugeAddress: string): string {
    return Relayer.encodeGaugeWithdraw(
      gaugeAddress,
      sender,
      this.addresses.relayer,
      amount
    );
  }

  /**
   * Uses relayer to deposit user's BPT to gauge and sends to recipient
   *
   * @param recipient Recipient address.
   * @param gaugeAddress Gauge address.
   * @returns deposit call
   */
  buildDeposit(recipient: string, gaugeAddress: string): string {
    return Relayer.encodeGaugeDeposit(
      gaugeAddress,
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
