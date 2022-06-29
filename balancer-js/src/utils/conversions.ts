import { BigNumber, parseFixed, formatFixed } from '@ethersproject/bignumber';

export function realNumberToEvm(stringNumber: string): bigint {
  return parseFixed(stringNumber, 18).toBigInt();
}

export function evmToRealNumber(bigIntNumber: bigint): string {
  return formatFixed(BigNumber.from(bigIntNumber), 18);
}
