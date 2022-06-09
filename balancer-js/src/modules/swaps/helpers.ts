import { BigNumberish, BigNumber } from '@ethersproject/bignumber';
import { Zero, WeiPerEther } from '@ethersproject/constants';

import { SwapType } from './types';
import { isSameAddress } from '@/lib/utils';

/**
 * Helper to create limits using a defined slippage amount.
 * @param tokensIn - Array of token in addresses.
 * @param tokensOut - Array of token out addresses.
 * @param swapType - Type of swap - SwapExactIn or SwapExactOut
 * @param deltas - An array with the net Vault asset balance deltas. Positive amounts represent tokens (or ETH) sent to the Vault, and negative amounts represent tokens (or ETH) sent by the Vault. Each delta corresponds to the asset at the same index in the `assets` array.
 * @param assets - array contains the addresses of all assets involved in the swaps.
 * @param slippage - Slippage to be applied. i.e. 5%=50000000000000000.
 * @returns Returns an array (same length as assets) with limits applied for each asset.
 */
export function getLimitsForSlippage(
  tokensIn: string[],
  tokensOut: string[],
  swapType: SwapType,
  deltas: BigNumberish[],
  assets: string[],
  slippage: BigNumberish
): BigNumberish[] {
  // Limits:
  // +ve means max to send
  // -ve mean min to receive
  // For a multihop the intermediate tokens should be 0
  const limits: BigNumber[] = new Array(assets.length).fill(Zero);

  assets.forEach((token, i) => {
    if (tokensIn.some((tokenIn) => isSameAddress(token, tokenIn))) {
      // For SwapExactOut slippage is on tokenIn, i.e. amtIn + slippage
      const slippageAmount = BigNumber.from(slippage).add(WeiPerEther);
      limits[i] =
        swapType === SwapType.SwapExactOut
          ? limits[i].add(
              BigNumber.from(deltas[i]).mul(slippageAmount).div(WeiPerEther)
            )
          : limits[i].add(deltas[i]);
    }

    if (tokensOut.some((tokenOut) => isSameAddress(token, tokenOut))) {
      // For SwapExactIn slippage is on tokenOut, i.e. amtOut - slippage
      const slippageAmount = WeiPerEther.sub(BigNumber.from(slippage));
      limits[i] =
        swapType === SwapType.SwapExactIn
          ? limits[i].add(
              BigNumber.from(deltas[i]).mul(slippageAmount).div(WeiPerEther)
            )
          : limits[i].add(deltas[i]);
    }
  });

  return limits;
}
