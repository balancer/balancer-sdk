import { SwapInfo } from '@balancer-labs/sor';
import { BigNumber } from '@ethersproject/bignumber';
import { tokenForSwaps } from './swap_utils';
import { SwapType } from '../types';

interface AmountForLimit {
  amount: BigNumber;
  max: (slippage: number) => BigNumber;
  min: (slippage: number) => BigNumber;
}

interface SDKSwapInfo extends SwapInfo {
  /** Name mapping to improve readability. */
  amountIn: BigNumber;
  amountOut: BigNumber;
  /** Name mapping for amounts used specifically for limits calculations. */
  amountInForLimits: AmountForLimit;
  amountOutForLimits: AmountForLimit;
  /** Wrapped token addresses used in the swap. */
  tokenInForSwaps: string;
  tokenOutFromSwaps: string;
}

/** Applies slippage to a number */
function amountForLimit(amount: BigNumber): AmountForLimit {
  return {
    amount,
    max: (maxSlippage: number): BigNumber => {
      return amount.mul(1e4 + maxSlippage).div(1e4);
    },
    min: (maxSlippage: number): BigNumber => {
      return amount.mul(1e4 - maxSlippage).div(1e4);
    },
  };
}

function decorateSorSwapInfo(
  swapInfo: SwapInfo,
  swapType: SwapType
): SDKSwapInfo {
  const amountIn =
    swapType === SwapType.SwapExactIn
      ? swapInfo.swapAmount
      : swapInfo.returnAmount;
  const amountOut =
    swapType === SwapType.SwapExactIn
      ? swapInfo.returnAmount
      : swapInfo.swapAmount;
  const amountInForLimits =
    swapType === SwapType.SwapExactIn
      ? swapInfo.swapAmountForSwaps || swapInfo.swapAmount
      : swapInfo.returnAmountFromSwaps || swapInfo.returnAmount;
  const amountOutForLimits =
    swapType === SwapType.SwapExactIn
      ? swapInfo.returnAmountFromSwaps || swapInfo.returnAmount
      : swapInfo.swapAmountForSwaps || swapInfo.swapAmount;
  const tokenInForSwaps = tokenForSwaps(swapInfo.tokenIn);
  const tokenOutFromSwaps = tokenForSwaps(swapInfo.tokenOut);

  return {
    ...swapInfo,
    amountIn,
    amountOut,
    amountInForLimits: amountForLimit(amountInForLimits),
    amountOutForLimits: amountForLimit(amountOutForLimits),
    tokenInForSwaps,
    tokenOutFromSwaps,
  };
}

export { SDKSwapInfo, tokenForSwaps, decorateSorSwapInfo };
