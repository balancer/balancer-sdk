import { Address, PoolType } from '@/types';
import { getAddress } from '@ethersproject/address';
import { Log, TransactionReceipt } from '@ethersproject/providers';
import { Interface, LogDescription } from '@ethersproject/abi';
import { Logger } from '@/lib/utils/logger';

export * from './assetHelpers';
export * from './errors';
export * from './permit';
export * from './poolHelper';
export * from './signatures';
export * from './tokens';
export * from './debouncer';
export * from './math';
export * from './slippageHelper';

export const isSameAddress = (address1: string, address2: string): boolean =>
  getAddress(address1) === getAddress(address2);

export function insert<T>(arr: T[], index: number, newItem: T): T[] {
  if (index < 0 || index > arr.length) {
    return arr;
  }
  return [
    // part of the array before the specified index
    ...arr.slice(0, index),
    // inserted item
    newItem,
    // part of the array after the specified index
    ...arr.slice(index),
  ];
}

/**
 * Returns a new array with item on the specified index replaced by newItem
 * @param arr
 * @param index
 * @param newItem
 */
export function replace<T>(arr: T[], index: number, newItem: T): T[] {
  if (index < 0 || index >= arr.length) {
    return arr;
  }
  return [
    // part of the array before the specified index
    ...arr.slice(0, index),
    // inserted item
    newItem,
    // part of the array after the specified index
    ...arr.slice(index + 1),
  ];
}

/**
 * Removes item from array at specified index and returns new array. (Does not mutate original)
 * @param arr Original array
 * @param index Index of item to be removed
 * @returns New array with item at index removed
 */
export function removeItem<T>(arr: T[], index: number): T[] {
  const newArray = [...arr];
  if (index < 0 || index >= arr.length) {
    return newArray;
  }
  newArray.splice(index, 1);
  return newArray;
}

/**
 * REORDER ARRAYS USING A REFERENCE AND ORIGINAL ARRAY,
 * Example:
 * Input -> reference: [c,b,a], original: [a,b,c], others: [[1,2,3], [4,5,6]]
 * Sorts like -> [[c,b,a],[3,2,1],[6,5,4]]
 * Returns -> [6,5,4]
 * @param reference
 * @param original
 * @param others
 * @returns Sorted others
 */
export function reorderArrays<T>(
  reference: T[],
  original: T[],
  ...others: unknown[][]
): unknown[][] {
  if (
    reference.length !== original.length ||
    others.some((arr) => arr.length !== original.length)
  ) {
    throw new Error('Array length mismatch');
  }
  const indexesOfOriginal = reference.map((value) => original.indexOf(value));
  if (indexesOfOriginal.indexOf(-1) >= 0) {
    throw new Error('Invalid reference or original array');
  }
  const othersResorted: unknown[][] = [];
  indexesOfOriginal.forEach((indexOfOriginal, i) => {
    others.forEach((arr, arrIndex) => {
      if (!othersResorted[arrIndex]) {
        othersResorted[arrIndex] = [];
      }
      othersResorted[arrIndex][i] = arr[indexOfOriginal];
    });
  });
  return othersResorted;
}

export function isLinearish(poolType: string): boolean {
  const supportedPoolTypes: string[] = Object.values(PoolType);
  if (poolType.includes('Linear') && supportedPoolTypes.includes(poolType))
    return true;
  else return false;
}

export function truncateAddresses(addresses: string[]): string[] {
  return addresses.map((t) => `${t.slice(0, 6)}...${t.slice(38, 42)}`);
}

export const findEventInReceiptLogs = ({
  receipt,
  to,
  contractInterface,
  logName,
}: {
  receipt: TransactionReceipt;
  to: Address;
  contractInterface: Interface;
  logName: string;
}): LogDescription => {
  const event = receipt.logs
    .filter((log: Log) => {
      return isSameAddress(log.address, to);
    })
    .map((log) => {
      try {
        return contractInterface.parseLog(log);
      } catch (error) {
        const logger = Logger.getInstance();
        logger.warn(error as string);
        return null;
      }
    })
    .find((parsedLog) => parsedLog?.name === logName);
  if (!event) {
    throw new Error('Event not found in logs');
  }
  return event;
};

export const getRandomBytes32 = (): string => {
  const getRandomBytes8 = () => Math.random().toString(16).slice(2, 10);
  const randomBytes32 = Array(8).fill(null).map(getRandomBytes8).join('');
  return `0x${randomBytes32}`;
};
