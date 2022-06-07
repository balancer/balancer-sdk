import { parseFixed, formatFixed } from '@ethersproject/bignumber';

/**
 * Multiplies input amount by slippage in order to calculate delta
 *
 * @param amount Input amount (not parsed)
 * @param decimals Decimals used to parse input amount
 * @param slippage Slippage value in percentage - e.g. 0.01 === 1%
 * @returns Result delta from multiplying amount and slippage
 */
export const mulSlippage = (
  amount: string,
  decimals: number,
  slippage: string
): string => {
  const parsedAmount = parseFixed(amount, decimals);
  const parsedDelta = parsedAmount
    .mul(parseFixed(slippage, 4))
    .div(parseFixed('1', 4));
  return formatFixed(parsedDelta, decimals);
};

/**
 * Subtracts input amount by slippage factor
 *
 * @param amount Input amount (not parsed)
 * @param decimals Decimals used to parse input amount
 * @param slippage Slippage value in percentage - e.g. 0.01 === 1%
 * @returns Result amount subtracting slippage
 */
export const subSlippage = (
  amount: string,
  decimals: number,
  slippage: string
): string => {
  const delta = mulSlippage(amount, decimals, slippage);
  const parsedDelta = parseFixed(delta, decimals);
  const parsedAmount = parseFixed(amount, decimals);
  const parsedResult = parsedAmount.sub(parsedDelta);
  return formatFixed(parsedResult, decimals);
};

/**
 * Adds input amount by slippage factor
 *
 * @param amount Input amount (not parsed)
 * @param decimals Decimals used to parse input amount
 * @param slippage Slippage value in percentage - e.g. 0.01 === 1%
 * @returns Result amount adding slippage
 */
export const addSlippage = (
  amount: string,
  decimals: number,
  slippage: string
): string => {
  const delta = mulSlippage(amount, decimals, slippage);
  const parsedDelta = parseFixed(delta, decimals);
  const parsedAmount = parseFixed(amount, decimals);
  const parsedResult = parsedAmount.add(parsedDelta);
  return formatFixed(parsedResult, decimals);
};
