import { BigNumber, BigNumberish } from '@ethersproject/bignumber';
import { BatchSwap, FundManagement, SwapType } from '../types';
import { Interface, JsonFragment } from '@ethersproject/abi';
import { SwapInfo } from '@balancer-labs/sor';
import { SDKSwapInfo, decorateSorSwapInfo } from './swap_info_decorator';
import { AddressZero } from '@ethersproject/constants';
import { swapFragment, relayerResolver, SwapRelayer } from './swap_utils';

class BatchSwapBuilder {
  private swapInfo: SDKSwapInfo;
  funds?: FundManagement;
  limits?: BigNumberish[];
  deadline?: BigNumberish;
  relayer: SwapRelayer;
  readonly functionName = 'batchSwap';

  /**
   * Building swap transaction data
   *
   * @param swapInfo SOR result
   * @param kind
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
    this.deadline = deadline;
  }

  /**
   * Given IN it's the minimum amount we are willing to accept.
   * Given OUT it's the fixed amount defined as output.
   */
  minAmountOut(maxSlippage: number): BigNumber {
    return this.kind === SwapType.SwapExactIn
      ? this.swapInfo.amountOutForLimits.min(maxSlippage)
      : this.swapInfo.amountOutForLimits.amount;
  }

  /**
   * Given IN it's the fixed amount we define as input.
   * Given OUT it's the maximum amount we are willing to pay for the request.
   */
  maxAmountIn(maxSlippage: number): BigNumber {
    return this.kind === SwapType.SwapExactOut
      ? this.swapInfo.amountInForLimits.max(maxSlippage)
      : this.swapInfo.amountInForLimits.amount;
  }

  /**
   * Calculates limits for token amount.
   * Maximum number of tokens to send is a positive number
   * Minimum amount of tokens to receive is a negative number
   * https://dev.balancer.fi/guides/swaps/batch-swaps
   * https://dev.balancer.fi/resources/swaps/batch-swaps#multi-hop-examples
   *
   * For batchSwap:
   * An array of of the maximum net amounts of each asset which can be taken to perform the swap.
   * Should the total trade require more than limits[i] tokens to be taken from sender for any i
   * then the transaction shall fail.
   *
   * @param maxSlippage [bps], eg: 1 === 0.01%, 100 === 1%
   */
  setLimits(maxSlippage: number): void {
    // TODO: This implementation handles only a single input. We might want to extend it for multiple token inputs
    this.limits = this.swapInfo.tokenAddresses
      .map((token) => {
        let amount = BigNumber.from(0);
        if (token === this.swapInfo.tokenInForSwaps) {
          amount = this.maxAmountIn(maxSlippage);
        }
        if (token === this.swapInfo.tokenOutFromSwaps) {
          amount = this.minAmountOut(maxSlippage).mul(-1);
        }
        return amount;
      })
      .map((limit) => limit.toString().split('.')[0]);
  }

  attributes(): BatchSwap {
    // TODO: Raise errors when some parameters are missing
    if (!this.funds || !this.limits || !this.deadline) {
      throw new Error('Uninitialized arguments');
    }

    let attrs: BatchSwap = {
      kind: this.kind,
      swaps: this.swapInfo.swaps,
      assets: this.swapInfo.tokenAddresses,
      funds: this.funds,
      limits: this.limits,
      deadline: this.deadline,
    };

    const fragment = this.fragment();

    // TODO: Call this logic from a relayer module maybe? Do we actually need to do that?
    // additional parameters on a contract:
    // https://github.com/balancer-labs/balancer-v2-monorepo/blob/master/pkg/standalone-utils/contracts/relayer/VaultActions.sol#L67
    if (fragment[0].inputs && fragment[0].inputs?.length > 6) {
      attrs = {
        ...attrs,
        value: '0',
        outputReferences: [],
      };
    }

    return attrs;
  }

  data(): string {
    const contractInterface = new Interface(this.fragment());

    return contractInterface.encodeFunctionData(
      'batchSwap',
      Object.values(this.attributes())
    );
  }

  value(maxSlippage: number): BigNumber {
    let amount = BigNumber.from(0);
    if (this.swapInfo.tokenIn === AddressZero)
      amount = this.maxAmountIn(maxSlippage);
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

export { BatchSwapBuilder };
