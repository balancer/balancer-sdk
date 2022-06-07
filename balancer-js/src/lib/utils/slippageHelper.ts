import { parseFixed, formatFixed } from '@ethersproject/bignumber';

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
