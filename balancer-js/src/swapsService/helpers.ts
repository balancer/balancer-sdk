import { BigNumberish, BigNumber } from '@ethersproject/bignumber';
import { Zero, WeiPerEther } from '@ethersproject/constants';

import { SwapType } from './types';
import { isSameAddress } from '../utils';

/*
* Helper to create limits using a defined slippage amount.
* @param tokensIn - Array of token in addresses.
* @param tokensOut - Array of token out addresses.
* @param swapType - Type of swap - SwapExactIn or SwapExactOut
* @param amountsTokenIn - Swap amounts for each token from tokensIn. +ve means max to send, -ve mean min to receive.
* @param amountsTokenOut - Swap amounts for each token from tokensOut. +ve means max to send, -ve mean min to receive.
* @param assets - array contains the addresses of all assets involved in the swaps.
* @param slippage - Slippage to be applied. i.e. 5%=50000000000000000.
* @returns Returns an array (same length as assets) with limits applied for each asset.
*/
export function getLimitsForSlippage(
    tokensIn: string[],
    tokensOut: string[],
    swapType: SwapType,
    amountsTokenIn: BigNumberish[],
    amountsTokenOut: BigNumberish[],
    assets: string[],
    slippage: BigNumberish
): BigNumberish[] {
    // Limits:
    // +ve means max to send
    // -ve mean min to receive
    // For a multihop the intermediate tokens should be 0
    const limits: BigNumber[] = new Array(assets.length).fill(Zero);

    const slippageAmount = BigNumber.from(slippage).add(WeiPerEther);

    assets.forEach((token, i) => {
        tokensIn.forEach((tokenIn, j) => {
            if(isSameAddress(token, tokenIn)){
                // For SwapExactOut slippage is on tokenIn
                limits[i] = swapType === SwapType.SwapExactOut ? limits[i].add(BigNumber.from(amountsTokenIn[j]).mul(slippageAmount).div(WeiPerEther)) : limits[i].add(amountsTokenIn[j]);
            }
        })

        tokensOut.forEach((tokenOut, j) => {
            if (isSameAddress(token, tokenOut)){ 
                // For SwapExactIn slippage is on tokenOut
                limits[i] = swapType === SwapType.SwapExactIn ? limits[i].add(BigNumber.from(amountsTokenOut[j]).mul(slippageAmount).div(WeiPerEther)) : limits[i].add(amountsTokenOut[j]);
            }
        })
    });

    return limits;
}
