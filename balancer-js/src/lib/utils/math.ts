import {
  BigNumber,
  BigNumberish,
  parseFixed as _parseFixed,
  formatFixed as _formatFixed,
} from '@ethersproject/bignumber';

export function parseFixed(value: string, decimals?: BigNumberish): BigNumber {
  const valueWithTrimmedDecimals = new RegExp(`[0-9]+\\.?[0-9]{0,${decimals}}`);
  const result = value.match(valueWithTrimmedDecimals);
  let parsedValue = value;
  if (result) {
    parsedValue = result[0];
  }

  return _parseFixed(parsedValue, decimals);
}

export function formatFixed(value: BigNumber, decimals: BigNumberish): string {
  const ethersFormat = _formatFixed(value, decimals);
  return ethersFormat.replace(/(.0$)/, '');
}

export function parseToBigInt18(value: string): bigint {
  return parseFixed(value, 18).toBigInt();
}

export function formatFromBigInt18(value: bigint): string {
  return _formatFixed(BigNumber.from(value), 18);
}

/**
 * Like parseEther but for numbers. Converts floating point to BigNumber using 18 decimals
 */
export const bn = (value: number): BigNumber => _parseFixed(`${value}`, 18);
