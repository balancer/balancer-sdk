import { BigNumber } from '@ethersproject/bignumber';

const bpsPerOne = BigNumber.from('10000'); // number of basis points in 100%

/**
 * Multiplies input by slippage amount
 *
 * @param {BigNumber} amount Input amount (not parsed)
 * @param {BigNumber} slippage Slippage value in bps - i.e. 50 = 0.5%
 * @returns Result delta from multiplying amount and slippage
 */
export const mulSlippage = (
  amount: BigNumber,
  slippage: BigNumber
): BigNumber => {
  const delta = amount.mul(slippage).div(bpsPerOne);
  return delta;
};

/**
 * Reduce input amount by slippage factor
 *
 * @param {BigNumber} amount Input in EVM amounts
 * @param {BigNumber} slippage Slippage value in bps - i.e. 50 = 0.5%
 * @returns Result amount subtracting slippage
 */
export const subSlippage = (
  amount: BigNumber,
  slippage: BigNumber
): BigNumber => {
  const delta = mulSlippage(amount, slippage);
  return amount.sub(delta);
};

/**
 * Increase input amount by slippage factor
 *
 * @param {BigNumber} amount Input in EVM amounts
 * @param {BigNumber} slippage Slippage value in bps - i.e. 50 = 0.5%
 * @returns Result amount adding slippage
 */
export const addSlippage = (
  amount: BigNumber,
  slippage: BigNumber
): BigNumber => {
  const delta = mulSlippage(amount, slippage);
  return amount.add(delta);
};
