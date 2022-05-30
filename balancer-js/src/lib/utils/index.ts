import { getAddress } from '@ethersproject/address';
import OldBigNumber from 'bignumber.js';

export * from './errors';
export * from './permit';
export * from './signatures';
export * from './assetHelpers';
export * from './aaveHelpers';

export const isSameAddress = (address1: string, address2: string): boolean =>
    getAddress(address1) === getAddress(address2);

export function bnum(val: string | number | OldBigNumber): OldBigNumber {
    const number = typeof val === 'string' ? val : val ? val.toString() : '0';
    return new OldBigNumber(number);
}
