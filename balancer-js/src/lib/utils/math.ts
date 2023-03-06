import {
  BigNumber,
  BigNumberish,
  parseFixed as _parseFixed,
  formatFixed as _formatFixed,
} from '@ethersproject/bignumber';

/**
 * Scales a number up by 10 ^ decimals. Also ensures the returned value is an
 * integer, any additional decimals post scaling are removed.
 * @param value The value to be scaled up
 * @param decimals The total decimal places / order of magnitude to scale by
 * @returns The scaled value
 */
export function parseFixed(value: string, decimals?: BigNumberish): BigNumber {
  const valueWithTrimmedDecimals = new RegExp(`[0-9]+\\.?[0-9]{0,${decimals}}`);
  const result = value.match(valueWithTrimmedDecimals);
  let parsedValue = value;
  if (result) {
    parsedValue = result[0];
  }

  return _parseFixed(parsedValue, decimals);
}

/**
 * Scales a number down by 10 ^ decimals. Also ensures the returned value doesn't
 * have a .0 at the end, so integers are returned as integers.
 * @param value The value to be scaled down
 * @param decimals The total decimal places / order of magnitude to scale down by
 * @returns The scaled value
 */
export function formatFixed(
  value: BigNumberish,
  decimals: BigNumberish
): string {
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
