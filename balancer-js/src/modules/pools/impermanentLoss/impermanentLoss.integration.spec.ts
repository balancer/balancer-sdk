import { ImpermanentLossService } from '@/modules/pools/impermanentLoss/impermanentLossService';
import { BalancerSDK } from '@/modules/sdk.module';
import { Network, Pool, PoolToken } from '@/types';
import { expect } from 'chai';

const TEST_DATA: { [key: string]: { poolId: string; userAddress: string } } = {
  ComposableStablePool: {
    poolId:
      '0x8159462d255c1d24915cb51ec361f700174cd99400000000000000000000075d',
    userAddress: '0x558FA75074cc7cF045C764aEd47D37776Ea697d2',
  },
  WeightedPool: {
    poolId:
      '0x3d468ab2329f296e1b9d8476bb54dd77d8c2320f000200000000000000000426',
    userAddress: '',
  },
  WeightedPoolWithMissingPrice: {
    poolId:
      '0x017fe2f89a34a3485b66e50b3b25c588d70a787a0002000000000000000008c7',
    userAddress: '0x558FA75074cc7cF045C764aEd47D37776Ea697d2',
  },
  WeightedPoolWithMissingUserData: {
    poolId:
      '0x3d468ab2329f296e1b9d8476bb54dd77d8c2320f000200000000000000000426',
    userAddress: '0x558FA75074cc7cF045C764aEd47D37776Ea697d2',
  },
};

const rpcUrl = 'https://rpc.ankr.com/polygon';
const network = Network.POLYGON;
const sdk = new BalancerSDK({ network, rpcUrl });
const service = new ImpermanentLossService(
  sdk.data.tokenPrices,
  sdk.data.poolJoinExits
);

/*
 * REALLY MORE A LIST OF USE CASE SCENARIOS THAN AN INTEGRATION TEST.
 *
 * TODO: add stubbing
 */
describe('ImpermanentLossService', () => {
  context('when queried for Composable Stable Pool', () => {
    it('should return the IL', async () => {
      const testData = TEST_DATA.ComposableStablePool;
      const pool = await sdk.pools.find(testData.poolId);
      if (!pool) {
        throw new Error('poll not found');
      }
      const loss = await service.calcImpLoss(testData.userAddress, pool);
      expect(loss).gte(0);
    });
  });
  context.skip('when queried for Weighted Pool', () => {
    it('should return the IL', async () => {
      const testData = TEST_DATA.WeightedPool;
      const pool = await sdk.pools.find(testData.poolId);
      if (!pool) {
        throw new Error('poll not found');
      }
      const loss = await service.calcImpLoss(testData.userAddress, pool);
      expect(loss).gte(0);
    });
  });
  context.skip('when queried for pool Weighted Pool with missing price', () => {
    it('should throw an exception', async () => {
      const testData = TEST_DATA.WeightedPoolWithMissingPrice;
      const pool = await sdk.pools.find(testData.poolId);
      if (!pool) {
        throw new Error('poll not found');
      }
      expect(await service.calcImpLoss(testData.userAddress, pool)).to.throw();
    });
  });
  context.skip(
    'when queried for pool Weighted Pool with missing user data',
    () => {
      it('should throw an exception', async () => {
        const testData = TEST_DATA.WeightedPoolWithMissingUserData;
        const pool = await sdk.pools.find(testData.poolId);
        if (!pool) {
          throw new Error('poll not found');
        }
        expect(
          await service.calcImpLoss(testData.userAddress, pool)
        ).to.throw();
      });
    }
  );
});
