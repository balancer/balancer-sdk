import {
  BigNumber,
  BigNumberish,
  parseFixed as _parseFixed,
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
