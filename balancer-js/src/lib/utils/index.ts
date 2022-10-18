import { getAddress } from '@ethersproject/address';

export * from './errors';
export * from './permit';
export * from './signatures';
export * from './assetHelpers';
export * from './aaveHelpers';
export * from './poolHelper';
export * from './tokens';
export * from './debouncer';
export * from './math';

export const isSameAddress = (address1: string, address2: string): boolean =>
  getAddress(address1) === getAddress(address2);
