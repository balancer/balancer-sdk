/* eslint-disable @typescript-eslint/no-explicit-any */

import { BalancerError, BalancerErrorCode } from '@/balancerErrors';
import { ImpermanentLossService } from '@/modules/pools/impermanentLoss/impermanentLossService';
import { BalancerSDK } from '@/modules/sdk.module';
import { Network, Pool } from '@/types';
import { expect } from 'chai';

const TEST_DATA: { [key: string]: { poolId: string } } = {
  ComposableStablePool: {
    poolId:
      '0x8159462d255c1d24915cb51ec361f700174cd99400000000000000000000075d',
  },
  WeightedPool: {
    poolId:
      '0x3d468ab2329f296e1b9d8476bb54dd77d8c2320f000200000000000000000426',
  },
  WeightedPoolWithMissingPrice: {
    poolId:
      '0x017fe2f89a34a3485b66e50b3b25c588d70a787a0002000000000000000008c7',
  },
  WeightedPoolWithMissingUserData: {
    poolId:
      '0x3d468ab2329f296e1b9d8476bb54dd77d8c2320f000200000000000000000426',
  },
};

const rpcUrl = 'https://rpc.ankr.com/polygon';
const network = Network.POLYGON;
const sdk = new BalancerSDK({ network, rpcUrl });
const service = new ImpermanentLossService(
  sdk.data.tokenPrices,
  sdk.data.tokenHistoricalPrices
);

const getPool = async (poolId: string): Promise<Pool> => {
  const pool = await sdk.pools.find(poolId);
  if (!pool) {
    throw new Error('poll not found');
  }
  return pool;
};
/*
 * REALLY MORE A LIST OF USE CASE SCENARIOS THAN AN INTEGRATION TEST.
 *
 * TODO: add stubbing
 */
describe('ImpermanentLossService', () => {
  context('when queried for Composable Stable Pool', () => {
    it('should return an IL gte 0', async () => {
      const testData = TEST_DATA.ComposableStablePool;
      const pool = await getPool(testData.poolId);
      const timestamp = 1666601608;
      const loss = await service.calcImpLoss(timestamp, pool);
      expect(loss).gte(0);
    });
  });
  context('when queried for Weighted Pool', () => {
    it('should return an IL gte 0', async () => {
      const testData = TEST_DATA.WeightedPool;
      const pool = await getPool(testData.poolId);
      const timestamp = 1666601608;
      const loss = await service.calcImpLoss(timestamp, pool);
      expect(loss).gte(0);
    });
  });
  context('when queried for pool Weighted Pool with missing price', () => {
    it('should throw an exception', async () => {
      const testData = TEST_DATA.WeightedPoolWithMissingPrice;
      const pool = await getPool(testData.poolId);
      const timestamp = 1666276501;
      try {
        await service.calcImpLoss(timestamp, pool);
      } catch (e: any) {
        expect(e.message).eq(
          BalancerError.getMessage(BalancerErrorCode.MISSING_PRICE_RATE)
        );
      }
    });
  });
  context('when queried for pool Weighted Pool with missing user data', () => {
    it('should throw an exception', async () => {
      const testData = TEST_DATA.WeightedPoolWithMissingUserData;
      const pool = await getPool(testData.poolId);
      const timestamp = Date.now() + 3600000; //1 hour from now
      try {
        await service.calcImpLoss(timestamp, pool);
      } catch (e: any) {
        expect(e.message).eq(
          BalancerError.getMessage(BalancerErrorCode.TIMESTAMP_IN_THE_FUTURE)
        );
      }
    });
  });
});
