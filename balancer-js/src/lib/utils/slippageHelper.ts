import { BigNumber } from '@ethersproject/bignumber';

const bpsPerOne = '10000'; // number of basis points in 100%

/**
 * Multiplies input by slippage amount
 *
 * @param amount Input amount (not parsed)
 * @param slippage Slippage value in bps - i.e. 50 = 0.5%
 * @returns Result delta from multiplying amount and slippage
 */
export const mulSlippage = (amount: string, slippage: string): string => {
  const delta = BigNumber.from(amount)
    .mul(BigNumber.from(slippage))
    .div(BigNumber.from(bpsPerOne));
  return delta.toString();
};

/**
 * Reduce input amount by slippage factor
 *
 * @param amount Input in EVM amounts
 * @param slippage Slippage value in bps - i.e. 50 = 0.5%
 * @returns Result amount subtracting slippage
 */
export const subSlippage = (amount: string, slippage: string): string => {
  const delta = mulSlippage(amount, slippage);
  return BigNumber.from(amount).sub(BigNumber.from(delta)).toString();
};

/**
 * Increase input amount by slippage factor
 *
 * @param amount Input in EVM amounts
 * @param slippage Slippage value in bps - i.e. 50 = 0.5%
 * @returns Result amount adding slippage
 */
export const addSlippage = (amount: string, slippage: string): string => {
  const delta = mulSlippage(amount, slippage);
  return BigNumber.from(amount).add(BigNumber.from(delta)).toString();
};
