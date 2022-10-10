import BigNumber from 'bignumber.js';

export function bnum(val: string | number | BigNumber): BigNumber {
    const number = typeof val === 'string' ? val : val ? val.toString() : '0';
    return new BigNumber(number);
}

export const bnumZero = bnum(0);

