import { BigNumber, BigNumberish } from '@ethersproject/bignumber';
import { FundManagement, SingleSwap, Swap, SwapType } from '../types';
import { Interface, JsonFragment } from '@ethersproject/abi';
import { SwapInfo } from '@balancer-labs/sor';
import { SDKSwapInfo, decorateSorSwapInfo } from './swap_info_decorator';
import { AddressZero } from '@ethersproject/constants';
import { swapFragment, relayerResolver, SwapRelayer } from './swap_utils';

class SingleSwapBuilder {
  private swapInfo: SDKSwapInfo;
  funds?: FundManagement;
  limit?: BigNumberish;
  deadline?: BigNumberish;
  relayer: SwapRelayer;
  readonly functionName = 'swap';

  /**
   * Building swap transaction data
   *
   * @param swapInfo SOR result
   * @param kind
   * @param chainId used to resolve relayer addresses
   */
  constructor(
    swapInfo: SwapInfo,
    private readonly kind: SwapType,
    private readonly chainId: number
  ) {
    this.swapInfo = decorateSorSwapInfo(swapInfo);
    this.relayer = relayerResolver(
      this.swapInfo.tokenIn,
      this.swapInfo.tokenOut,
      this.chainId
    );
  }

  setFunds(userAddress: string): void {
    this.funds = {
      sender: userAddress,
      recipient: userAddress,
      fromInternalBalance: false,
      toInternalBalance: false,
    };
  }

  /**
   * @param deadline block timestamp
   */
  setDeadline(deadline: BigNumber): void {
    this.deadline = deadline.toString();
  }

  get amount(): BigNumber {
    return this.kind === SwapType.SwapExactOut
      ? this.swapInfo.amountOutForLimits.amount
      : this.swapInfo.amountInForLimits.amount;
  }

  /**
   * Calculates the limit for token amount.
   * https://dev.balancer.fi/guides/swaps/single-swaps
   * https://dev.balancer.fi/resources/swaps/single-swap
   *
   * For swap:
   * The meaning of limit depends on the value of kind
   *    GIVEN_IN: The minimum amount of tokens we would accept to receive from the swap.
   *    GIVEN_OUT: The maximum amount of tokens we would be sending to swap.
   *
   * @param maxSlippage [bps], eg: 1 === 0.01%, 100 === 1%
   */
  setLimits(maxSlippage: number): void {
    this.limit =
      this.kind === SwapType.SwapExactIn
        ? this.swapInfo.amountOutForLimits.min(maxSlippage).toString()
        : this.swapInfo.amountInForLimits.max(maxSlippage).toString();
  }

  get singleSwap(): SingleSwap {
    const poolId = this.swapInfo.swaps[0].poolId;
    const kind = this.kind;
    const assetIn = this.swapInfo.tokenInForSwaps;
    const assetOut = this.swapInfo.tokenOutFromSwaps;
    const amount = this.amount.toString();
    const userData = '0x';

    return {
      poolId,
      kind,
      assetIn,
      assetOut,
      amount,
      userData,
    };
  }

  attributes(): Swap {
    if (!this.funds || !this.limit || !this.deadline) {
      throw new Error('Uninitialized arguments');
    }

    // TODO: Raise errors when some parameters are missing
    let attrs: Swap = {
      request: this.singleSwap,
      funds: this.funds,
      limit: this.limit,
      deadline: this.deadline,
    };

    // TODO: Call this logic from a relayer module maybe? Do we actually need to do that?
    // additional parameters on a contract:
    // https://github.com/balancer-labs/balancer-v2-monorepo/blob/master/pkg/standalone-utils/contracts/relayer/VaultActions.sol#L44
    const fragment = this.fragment();
    if (fragment[0].inputs && fragment[0].inputs?.length > 4) {
      attrs = {
        ...attrs,
        value: '0',
        outputReference: '0',
      };
    }

    return attrs;
  }

  data(): string {
    const contractInterface = new Interface(this.fragment());

    return contractInterface.encodeFunctionData(
      'swap',
      Object.values(this.attributes())
    );
  }

  value(maxSlippage: number): BigNumber {
    let amount = BigNumber.from(0);
    if (this.swapInfo.tokenIn === AddressZero)
      amount =
        this.kind === SwapType.SwapExactIn
          ? this.swapInfo.amountIn
          : this.swapInfo.amountInForLimits.max(maxSlippage);
    return amount;
  }

  to(): string {
    return this.relayer.address;
  }

  private fragment(): JsonFragment[] {
    return swapFragment(this.relayer).filter(
      (f) => f.name === this.functionName
    );
  }
}

export { SingleSwapBuilder };
