import { getAddress } from '@ethersproject/address';

export * from './aaveHelpers';
export * from './assetHelpers';
export * from './errors';
export * from './permit';
export * from './poolHelper';
export * from './signatures';
export * from './scale';
export * from './tokens';

export const isSameAddress = (address1: string, address2: string): boolean =>
  getAddress(address1) === getAddress(address2);
