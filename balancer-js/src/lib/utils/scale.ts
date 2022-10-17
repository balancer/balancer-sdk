import BigNumber from 'bignumber.js';

export function scale(
  input: BigNumber | string,
  decimalPlaces: number
): BigNumber {
  const unscaled = typeof input === 'string' ? new BigNumber(input) : input;
  const scalePow = new BigNumber(decimalPlaces.toString());
  const scaleMul = new BigNumber(10).pow(scalePow);
  return unscaled.times(scaleMul);
}
