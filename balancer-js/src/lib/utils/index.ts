import { getAddress } from '@ethersproject/address';

export * from './aaveHelpers';
export * from './assetHelpers';
export * from './errors';
export * from './permit';
export * from './poolHelper';
export * from './signatures';
export * from './tokens';
export * from './debouncer';
export * from './math';

export const isSameAddress = (address1: string, address2: string): boolean =>
  getAddress(address1) === getAddress(address2);

export function insert<T>(arr: T[], index: number, newItem: T): T[] {
  return [
    // part of the array before the specified index
    ...arr.slice(0, index),
    // inserted item
    newItem,
    // part of the array after the specified index
    ...arr.slice(index),
  ];
}
